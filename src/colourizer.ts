import * as path from 'path';
import * as fs from 'mz/fs';
import { createNewColour } from './database/colour/actions';
import { getConnectionManager, Connection } from 'typeorm';
import { CommandFunction, CommandDefinition, RoleTypes } from 'simple-discordjs';
import { Guild } from './database/guild/model';
import { Colour } from './database/colour/model';
import { createGuildIfNone } from './database/guild/actions';
import { User } from './database/user/model';
import { createUserIfNone, findUser } from './database/user/actions';
import * as yaml from 'js-yaml';
import * as Discord from 'discord.js';
import { stripIndents, oneLineTrim } from 'common-tags';
import { dispatch, confirm } from './confirmer';
import { JSDOM } from 'jsdom';
import escapeStringRegexp = require('escape-string-regexp');


const webshot = require('webshot');
const createShot = (html: string, file: string, settings: any) => {
    return new Promise((res, rej) => {
        webshot(html, file, settings, (err: any) => {
            if (err) {
                rej(err);
            }

            res();
        });
    });
};

const sleep = (delay: number) => new Promise((res, rej) => {
    setTimeout(() => res(), delay);
});


interface ColourList {
    [key: string]: number;
}

type WithSilent = (silent: boolean) => Promise<boolean>;

const standardColours: ColourList = {
    red: 0xFF0000,
    orange: 0xFF7F00,
    yellow: 0xFFFF00,
    green: 0x00FF00,
    blue: 0x0000FF,
    indigo: 0x4B0082,
    violet: 0x9400D3,
};

export default class Colourizer {
    connection: Connection;
    singletonInProgress: boolean;

    constructor() {
        this.connection = getConnectionManager().get();
    }

    /************
     * COMMANDS *
     ************/

    public getSetCommand: () => CommandDefinition = () => {
        return {
            authentication: RoleTypes.ADMIN,
            command: {
                action: this.setColour,
                names: ['setcolor', 'setcolour'],
                parameters: '{{colour}} {{role}}',
            },
            description: {
                message: 'Sets a role colour to be registered.\
If no roles are mentions, perform a search for a role by name,\
and if more than one role is found, specify role name further.',
                example: '{{{prefix}}}setcolour green @role \n\
                 {{{prefix}}}setcolour green role_name_here',
            },
        };
    }

    public getColourCommand: () => CommandDefinition = () => {
        return {
            command: {
                action: this.getColour,
                names: ['colour', 'addcolour', 'getcolour', 'color', 'addcolor', 'getcolor', ''],
                parameters: '{{colour}}',
            },
            custom: {
                locked: true,
            },
            description: {
                message: 'Set a colour role to yourself',
                example: '{{{prefix}}}getcolour green',
            },
        };
    }

    /**
     * A quick hack to allow for pre-fix less colour commands.
     * instead of c.getcolour green
     * users can type 
     * green
     * into a set channel
     * @memberof Colourizer
     */
    public getDirtyColourCommand: (prefix: string) => CommandDefinition = (prefix: string) => {
        return {
            command: {
                action: async (message, options, params, client, self) => {
                    const res = new RegExp(`(.\s?)+`).exec(message.content);
                    if (res && !message.content.toLowerCase().startsWith(prefix)) {
                        await this
                            .getColour(
                            message,
                            options,
                            {
                                ...params,
                                named: {
                                    colour: res[0],
                                },
                            },
                            client,
                            self,
                        );
                    }
                    return false;
                },
                names: ['colourdirty'],
                noPrefix: true,
                pattern: /(.\s?)+/,
            },
            custom: {
                locked: true,
            },
        };
    }

    public guardChannel: (prefix: string) => CommandDefinition = prefix => (
        {
            command: {
                action: async (message, op, pr, cl, self) => {
                    const regex =
                        new RegExp(`${escapeStringRegexp(prefix)}([\\S]+)(\\s.+)?`);
                    const match = regex.exec(message.content);
                    if (match && match[1]) {
                        if (self.checkCommandExists(match[1])) {
                            return true;
                        }
                        confirm(
                            message,
                            'failure',
                            'Command does not exist!',
                            { delay: 1500, delete: true },
                        );
                    }
                    return true;
                },
                names: ['clean'],
                noPrefix: true,
                pattern: new RegExp(`${escapeStringRegexp(prefix)}.+`),
            },
            custom: {
                locked: true,
            },
        })

    public getQuickColourCommand: () => CommandDefinition = () => {
        return {
            command: {
                action: this.quickCreateColour,
                names: ['quickcolour', 'makecolour', 'quickcolor', 'makecolor'],
                parameters: '{{colourName}} {{colourCode}}',
            },
            authentication: RoleTypes.ADMIN,
            description: {
                message: 'Generate a new colour quickly with a hex code',
                example: '{{{prefix}}}quickcolour red FF0000',
            },
        };
    }

    public getListCommand: () => CommandDefinition = () => {
        return {
            command: {
                action: this.listColours,
                names: ['allcolours', 'colours', 'allcolors', 'colors'],
            },
            description: {
                message: 'Creates a singleton message that keeps a list of all colours,\
automatically updated',
                example: '{{{prefix}}}colours',
            },
            authentication: RoleTypes.ADMIN,
            custom: {
                locked: true,
            },
        };
    }

    public getGenerateColours: () => CommandDefinition = () => {
        return {
            command: {
                action: this.generateStandardColours,
                names: ['generate', 'generate_colours'],
            },
            authentication: RoleTypes.ADMIN,
            description: {
                message: 'Generates a set of starter colours. (ADMIN ONLY)',
                example: '{{{prefix}}}generate',
            },
        };
    }

    public getDeleteColour: () => CommandDefinition = () => {
        return {
            command: {
                action: this.deleteColourEntity,
                names: ['delete', 'remove', 'purge'],
                parameters: '{{colourName}}',
            },
            authentication: RoleTypes.ADMIN,
            description: {
                message: 'Delete a role from the schema. (ADMIN ONLY)',
                example: '{{{prefix}}}delete purple',
            },
        };
    }

    public getMessageCommand: () => CommandDefinition = () => (
        {
            command: {
                action: this.createChannelMessage,
                names: ['message', 'pin', 'msg'],
            },
            authentication: RoleTypes.ADMIN,
            description: {
                message: 'Create a message for the colour channel (ADMIN ONLY)',
                example: '{{{prefix}}}msg',
            },
        }
    )

    public getInitiateCommand: () => CommandDefinition = () => (
        {
            command: {
                action: this.initiateNewServer,
                names: ['init', 'initiate', 'newserver'],
            },
            authentication: RoleTypes.OWNER,
            description: {
                message: 'Initiate a new server, do this in a private channel! (OWNER ONLY)',
                example: '{{{prefix}}}init',
            },
        }
    )

    public getCycleExistingCommand: () => CommandDefinition = () => (
        {
            command: {
                action: this.cycleExistingRoles,
                names: ['cycle_existing', 'cycle'],
            },
            authentication: RoleTypes.ADMIN,
            description: {
                message: 'Cycles the existing server roles as an interactive prompt.',
                example: '{{{prefix}}}cycle',
            },
        }
    )

    /*********************
     * COMMAND FUNCTIONS *
     *********************/

    /**
     * Creates a help message in the colour channel.
     * // TODO: Allow for custom messages possibly?
     * // TODO: Track help messages like the list, to delete automatically when updated
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private createChannelMessage: CommandFunction = async (message) => {
        const guildRepo = await this.connection.getRepository(Guild);
        const guild = await guildRepo.findOneById(message.guild.id);

        if (guild && guild.channel) {
            const channel = <Discord.TextChannel>message
                .guild
                .channels
                .find('id', guild.channel);

            if (channel instanceof Discord.TextChannel) {
                channel.send(
                    stripIndents`
                        Request a colour by typing out one of the following colours below. 

                        __**Only type just the colour, no messages before or after it.**__

                        __Don't try to talk in this channel__
                        messages are deleted automatically if they don't match a command or colour.
                    `,
                );
                return true;
            }

            dispatch(message, 'failure', 'Channel not found!');
            return false;
        }

        dispatch(message, 'failure', 'Set a colour channel first!');
        return false;
    }


    /**
     * Create a list of colours currently in the guild schema
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private listColours: CommandFunction = async (message) => {
        try {
            this.updateOrListColours(message);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Determines if the colour list should be created, 
     * or update the existing one (delete and repost list)
     * 
     * @private
     * @param {Discord.Message} message 
     * @returns 
     * @memberof Colourizer
     */
    private async updateOrListColours(message: Discord.Message) {
        const guildRepo = await this.connection.getRepository(Guild);
        const guild =
            await guildRepo.findOneById(message.guild.id) ||
            await createGuildIfNone(message);

        if (guild.listmessage) {
            if (!guild.channel) {
                confirm(message, 'failure', 'use setchannel to create a colour channel.');
                return false;
            }
            const channel = <Discord.TextChannel>message
                .guild
                .channels
                .find('id', guild.channel);

            if (!channel || channel instanceof Discord.VoiceChannel) {
                confirm(message, 'failure', 'use setchannel to create a colour channel.');
                return false;
            }

            try {
                const msg = await channel.fetchMessage(guild.listmessage);
                this.syncColourList(msg);
                confirm(message, 'success');
                return true;
            } catch (e) {
                !this.singletonInProgress && this.createNewColourSingleton(message, guild);
                return true;
            }
        }

        !this.singletonInProgress && this.createNewColourSingleton(message, guild);
        return true;
    }

    /**
     * Creates a new list in the colour channel if none exists prior.
     * 
     * 
     * @private
     * @param {Discord.Message} message 
     * @param {Guild} guild 
     * @memberof Colourizer
     */
    private async createNewColourSingleton(message: Discord.Message, guild: Guild) {
        this.singletonInProgress = true;
        const msg = await message.channel.send(
        // tslint:disable:max-line-length
            stripIndents`The following message will be edited to a list of colours for this guild.
            These colours will automatically update on colour change.
            __Please do not delete this message__
            As images cannot be edited, do not pin the message, but the colour bot should maintain a clean (enough) channel history to keep the message at the top.`,
        );
        // tslint:enable:max-line-length
        const singleMsg = Array.isArray(msg) ? msg[0] : msg;
        const guildRepo = await this.connection.getRepository(Guild);
        guild.listmessage = singleMsg.id;
        guildRepo.persist(guild);

        await sleep(7000);

        await this.syncColourList(singleMsg);
        confirm(message, 'success');
        this.singletonInProgress = false;
    }

    /**
     * Updates the colour list already posted in the server.
     * This method was originally supposed to edit an embed,
     * however, the discord API does not support image editing,
     * therefore delete the image and post a new one.
     * Hacky? maybe.
     * 
     * @private
     * @param {Discord.Message} message 
     * @memberof Colourizer
     */
    private async syncColourList(message: Discord.Message) {
        const colourRepo = await this.connection.getRepository(Colour);
        const guildRepo = await this.connection.getRepository(Guild);
        const guild = await guildRepo.findOneById(message.guild.id)
            || await createGuildIfNone(message);

        const results = await colourRepo
            .createQueryBuilder('colour')
            .innerJoin('colour.guild', 'guild')
            .where('colour.guild = :guildID', { guildID: message.guild.id })
            .getMany();



        const dom =
            `<html style="margin: 0">
            <div id="list" style="
                font-size: 60px; 
                margin-top: 0;
                margin: 0;
                font-family: sans-serif;
                width: 100vw; 
                height: 100vh">
               ${results.map((item) => {
                const guildRole = message.guild.roles.find('id', item.roleID);
                if (!guildRole) {
                    return false;
                }
                const colour = guildRole.hexColor;

                return `
                    <div style="width: 50%; display: flex; float: left;"> 
                        <div style="
                            width: 80%; 
                            float: left;
                            text-align: center;
                            background-color: white;
                            color: ${colour}"> 
                            <span style="padding-left: 15px;">
                                ${item.name.replace('colour-', '')} 
                            </span>
                        </div>
                        <div style="
                            width: 20%; 
                            background-color: ${colour}; 
                            color: #${(0xFFFFFF ^ guildRole.color).toString(16)};
                            float: right;"> 
                            <span style="width: 80%;">
                                ${colour.replace('#', '')}
                            </span>
                        </div> 
                    </div>
                    <div style="
                        width: 50%; 
                        display: flex; 
                        float: right;
                        background-color: #36393e"> 
                        <div style="
                            width: 80%; 
                            text-align: center;
                            float: left;
                            color: ${colour}"> 
                            ${item.name.replace('colour-', '')} 
                        </div>
                        <div style="
                            width: 20%; 
                            background-color: ${colour}; 
                            color: #${(0xFFFFFF ^ guildRole.color).toString(16)};
                            float: right;"> 
                            <span style="width: 80%;">
                                ${colour.replace('#', '')}
                            </span>
                        </div> 
                    </div>`;
            },
            ).join('\n')}
            </div>
        </html>`;

        const yamler = yaml.dump(results.map((colourItem) => {
            return {
                name: colourItem.name.replace('colour-', ''),
            };
        }));

        const img = 'list.png';
        await createShot(
            dom,
            img,
            {
                siteType: 'html',
                windowSize: {
                    height: `${results.length * 40}`,
                    width: '2500',
                },
                shotSize: {
                    height: 'all',
                    width: 'all',
                },
            });

        const newMsgResolve = await message.channel.send({ file: img });

        const newMessage = (Array.isArray(newMsgResolve)) ? newMsgResolve[0] : newMsgResolve;
        guild.listmessage = newMessage.id;
        guildRepo.persist(guild);

        message.delete()
            .catch((e) => {
                // message was probably deleted by something else.
            });
    }

    /**
     * Finds a colour from a command schema such as 
     * {{ colour }}
     * and adds it to the user.
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private getColour: CommandFunction = async (
        message,
        options,
        parameters: { array: string[], named: { colour: string } },
        client,
        self,
        silent: boolean = false,
    ) => {
        const colourRepo = await this.connection.getRepository(Colour);
        const userRepo = await this.connection.getRepository(User);
        const guildRepo = await this.connection.getRepository(Guild);


        const colour = await colourRepo.createQueryBuilder('colour')
            .innerJoin('colour.guild.id', 'guild')
            .where('colour.guild = :guildId', { guildId: message.guild.id })
            .andWhere(
            'colour.name LIKE :colourName',
            { colourName: `%${parameters.named.colour}%` },
        )
            .getOne();


        const guild = await guildRepo.findOneById(message.guild.id);

        if (guild == null) {
            await confirm(message, 'failure', 'Guild Error.');
            return false;
        }

        if (colour == null) {
            if (!silent) {
                await confirm(
                    message, 
                    'failure', 
                    oneLineTrim`Colour was not found. Check your spelling
                        of the colour, else ask an admin to add the colour.`,
                );
            }
            return false;
        }

        const userEntitiy = await findUser(message.author.id, guild, this.connection)
            || await createUserIfNone(message.author, guild, this.connection, colour);

        if (userEntitiy === undefined) {
            await confirm(message, 'failure', 'Error when creating user.');
            return;
        }

        const user = await findUser(message.author.id, guild, this.connection); 

        if (user == null) {
            message.channel.send('User is not in schema: ' + user);
            return false;
        }

        return await this.setColourToUser(colour, this.connection, user, guild, message);
    }

    /**
     * Persist a colour to the user entity for the guild.
     * @param newColour 
     * @param connection 
     * @param user 
     * @param guild 
     * @param message 
     */
    async setColourToUser(
        newColour: Colour,
        connection: Connection,
        user: User,
        guild: Guild,
        message: Discord.Message,
    ) {
        try {
            const userRepo = await connection.getRepository(User);
            const colourRepo = await connection.getRepository(Colour);
            const guildRepo = await connection.getRepository(Guild);


            const colourList = await colourRepo.find();
            if (user.colours[0] !== undefined) {
                const oldColour = message.guild.roles.get(user.colours[0].roleID);
                if (oldColour === undefined) {
                    confirm(message, 'failure', 'Error setting colour!');
                    return false;
                }

                await message.guild.member(message.author).removeRole(oldColour);
            }
            const userMember = message.guild.member(message.author.id);
            const possibleColours = colourList
                .map(colour => userMember.roles.find('name', colour.name))
                .filter(id => id);

            await userMember.removeRoles(possibleColours);

            const updatedUser = await userRepo.persist(user);

            user.colours.push(newColour);

            await colourRepo.persist(newColour);
            await userRepo.persist(user);
            await guildRepo.persist(guild);

            const nextColour = message.guild.roles.get(newColour.roleID.toString());
            if (nextColour === undefined) {
                confirm(message, 'failure', 'Error getting colour!');
                return false;
            }
            try {
                await message.guild.member(message.author).addRole(nextColour);
                confirm(message, 'success', undefined, { delay: 1000, delete: true });
            } catch (e) {
                confirm(
                    message,
                    'failure',
                    `Error setting colour: ${e}`,
                    { delay: 3000, delete: true },
                );
            }

            return true;
        } catch (e) {
            confirm(message, 'failure', `error: ${e}`);
            return false;
        }
    }

    /**
     * Sets a colour to the guild schema, only to be used by admins/mods
     * c.setcolour {{name}} {{green}}
     * will add the colour to the schema to be synced into the guild schema.
     * 
     * **Colours will automatically be synced on a change, so old roles will
     * be sycned properly, making it easier to migrate**
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private setColour: CommandFunction = async (
        message,
        options,
        parameters: { array: string[], named: { colour: string, role: string } },
    ) => {
        const guildRepo = await this.connection.getRepository(Guild);
        const colourRepo = await this.connection.getRepository(Colour);


        const roleID = await this.findRole(message, parameters.named.role);
        if (!roleID) {
            await confirm(
                message, 
                'failure', 
                oneLineTrim`No usable roles could be found!
                    Mention a role or redefine your search parameters.`,
                );
            return false;
        }

        const guild = await guildRepo.findOneById(message.guild.id)
            || await createGuildIfNone(message);

        this.setColourEntity(parameters.named.colour, guild, roleID, message);
        return true;
    }

    /**
     * Adds the colour to the guild database.
     * 
     * @private
     * @param {string} colourName 
     * @param {Guild} guild 
     * @param {string} roleID 
     * @param {Discord.Message} message 
     * @param {boolean} [silent=false] 
     * @returns 
     * @memberof Colourizer
     */
    private async setColourEntity(
        colourName: string,
        guild: Guild,
        roleID: string,
        message: Discord.Message,
        silent: boolean = false,
        noListUpdate: boolean = false) {
        const colourRepo = await this.connection.getRepository(Colour);
        const guildRepo = await this.connection.getRepository(Guild);

        const colour = await colourRepo
            .createQueryBuilder('colour')
            .innerJoin('colour.guild', 'guild')
            .where('colour.guild = :guildID', { guildID: guild.id })
            .andWhere('colour.name LIKE :colourName', { colourName })
            .getOne();

        if (colour === undefined) {
            const newColour = await createNewColour(message, colourName, roleID);
            if (!newColour) {
                confirm(message, 'failure', 'Failure setting colour!');
                throw new Error('Colour failure!');
            }

            if (!silent) {
                confirm(message, 'success');
            }

            if (!noListUpdate) {
                this.updateOrListColours(message);
            }

            return true;
        }

        try {
            colour.guild = guild;
            colour.roleID = roleID;

            await colourRepo.persist(colour);
            await guildRepo.persist(guild);

            if (!silent) {
                confirm(message, 'success');
            }

            if (!noListUpdate) {
                this.updateOrListColours(message);
            }

            return true;
        } catch (e) {
            confirm(message, 'failure', `Error when updating colour: ${e.toString()}`);
            throw new Error('Colour failure!');
        }
    }

    /**
     * Finds a role from a search instead of mentioning the colour role itself.
     * Names must be UNIQUE.
     * 
     * @private
     * @param {Discord.Message} message 
     * @param {string} role 
     * @returns {(Promise<string | false>)} 
     * @memberof Colourizer
     */
    private async findRole(message: Discord.Message, role: string): Promise<string | false> {
        const roleKey = message.mentions.roles.firstKey();

        if (roleKey) {
            return roleKey;
        }

        const search = message.guild.roles.filter(roleObject => roleObject.name.includes(role));

        if (search.size > 1) {
            await confirm(
                message,
                'failure',
                stripIndents`Multiple results found for the search ${role}!
                Expected one role, found: 
                    ${
                    search
                        .map(roleOjb => `Rolename: ${roleOjb.name.replace('@', '')}`)
                        .join('\n')
                    }
                `,
                { delay: 10000, delete: true });
            return false;
        }

        return search.firstKey();
    }

    /**
     * Creates a standard set of colours for demonstration and quick use.
     * Current just generates the standard 7 rainbow colours.
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private generateStandardColours: CommandFunction = async (message) => {
        for (const [colourName, colourCode] of Object.entries(standardColours)) {
            const discordGuild = message.guild;
            const oldRole = await discordGuild.roles.find('name', `colour-${colourName}`);
            const role = (oldRole)
                ? oldRole
                : await discordGuild.createRole({
                    name: `colour-${colourName}`,
                    color: colourCode,
                });

            if (!role) {
                continue;
            }
            const guildRepo = await this.connection.getRepository(Guild);

            const guild = await guildRepo.findOneById(discordGuild.id)
                || await createGuildIfNone(message);

            if (!guild) {
                await confirm(
                    message, 
                    'failure', 
                    oneLineTrim`Error when setting roles,
                        guild not part of the current database.`,
                );
                break;
            }

            try {
                this.setColourEntity(`colour-${colourName}`, guild, role.id, message, true, true);
            } catch (e) {
                break;
            }
        }

        await confirm(message, 'success');
        return true;
    }

    /**
     * Quick utility method for mods to create a new colour role quickly.
     * c.quickcolour {{name}} {{colour_code}}
     * // TODO allow colour code to accept a #
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private quickCreateColour: CommandFunction = async (message, options, params: {
        array: string[],
        named: {
            colourName: string,
            colourCode: string,
        },
    }) => {
        const colour = /(?:#)?[0-9a-f]{6}/gmi.exec(params.named.colourCode);
        const guildRepo = await this.connection.getRepository(Guild);
        const guild = await guildRepo.findOneById(message.guild.id)
            || await createGuildIfNone(message);

        if (!colour) {
            await confirm(message, 'failure', 'No colour was specified');
            return false;
        }

        const colourCode = colour[0];

        const colourEntity = await
            message.guild.createRole({
                name: params.named.colourName,
                color: parseInt(colourCode.replace('#', ''), 16),
            });

        this.setColourEntity(params.named.colourName, guild, colourEntity.id, message);

        return true;
    }

    /**
     * Deletes a colour from the db and the role, if it exists
     * For admins only.
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private deleteColourEntity: CommandFunction = async (message, ots, params: {
        array: string[],
        named: {
            colourName: string,
        },
    }) => {
        const colourRepo = await this.connection.getRepository(Colour);
        const guildRepo = await this.connection.getRepository(Guild);

        const colour = await colourRepo
            .createQueryBuilder('colour')
            .innerJoin('colour.guild', 'guild')
            .where('colour.guild = :guildID', { guildID: message.guild.id })
            .andWhere('colour.name LIKE :colourName', { colourName: params.named.colourName })
            .getOne();

        if (!colour) {
            confirm(
                message,
                'failure',
                'Colour was not found, check your name with the colourlist.',
            );
            return false;
        }

        const role = await message.guild.roles.find('id', colour.roleID);
        if (role) {
            role.delete();
        }

        await colourRepo.remove(colour);
        this.updateOrListColours(message);
        confirm(message, 'success');
        return true;
    }

    /**
     * An initiate command for a new server.
     * Makes the initial setup process much easier.
     * 
     * It will make the owner define the colour channel,
     * then an admin role,
     * then prompt it for additional, useful features.
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private initiateNewServer: CommandFunction = async (
        message,
        opts,
        params,
        client,
        self,
    ) => {
        const author = message.author;
        const prefix = self.defaultPrefix.str;
        const msgVec = await message.channel.send(
            stripIndents`Welcome to Colour Bot!
            It is recommended to do this command in a mod channel.
            Type \`y\` or \`n\` to confirm continue`);
        const msg = Array.isArray(msgVec) ? msgVec[0] : msgVec;

        const replyMessage = await this.getNextReply(message, author);

        if (replyMessage.content.toLowerCase().startsWith('n') 
            || !replyMessage.content.toLowerCase().startsWith('y')) {
            confirm(message, 'failure', 'Command was killed by calle.');
            msg.delete();
            replyMessage.delete();
            return;
        }

        replyMessage.delete();
        msg.edit(
            `Step 1: set a colour channel with using ${prefix}setchannel #channel`,
        );

        const nextReply = await this.getNextReply(message, author);
        const chan = nextReply.mentions.channels.first();

        if (!nextReply.content.includes('setchannel')) {
            confirm(message, 'failure', 'Failed to follow instructions!');
            msg.delete();
            nextReply.delete();
            return;
        }

        msg.edit(
            `Step 2: add your mod group in with ${prefix}addrole admin @admins`,
        );

        const adminReply = await this.getNextReply(message, author);
        if (adminReply.mentions.roles.size <= 0
            && !adminReply.content.includes('addrole')) {
            confirm(message, 'failure', 'Failed to follow instructions!');
            msg.delete();
            nextReply.delete();
            return;
        }

        adminReply.delete(1000);

        await msg.edit(
            `Would you like to generate a set of standard rainbow colours?  (\`y\` or \`n\`)`,
        );

        const generateReply = await this.getNextReply(message, author);

        if (generateReply.content.includes('y')) {
            const genVec = await message.channel.send('Generating...');
            const genMsg = Array.isArray(genVec) ? genVec[0] : genVec;

            /* Chill typescript, its fine, we only need a message object. */
            (this.generateStandardColours as (msg: Discord.Message) => Promise<boolean>)(genMsg);
        }

        generateReply.delete();



        await msg.edit(
            `Would you like to make help message (highly recommended!) (\`y\` or \`n\`)`,
        );

        const helpReply = await this.getNextReply(message, author);

        if (helpReply.content.includes('y')) {
            const helpVec = await chan.send('Getting Help?');
            const helpMsg = Array.isArray(helpVec) ? helpVec[0] : helpVec;

            (this.createChannelMessage as (msg: Discord.Message) => Promise<boolean>)(helpMsg);
            helpMsg.delete()
                .catch(e => null);
        }


        helpReply.delete();

        await msg.edit(
            `Would you like to create a colour list image? (\`y\` or \`n\`)`,
        );

        const listReply = await this.getNextReply(message, author);

        if (listReply.content.includes('y')) {
            const listVec = await chan.send('Generating List!');
            const listMsg = Array.isArray(listVec) ? listVec[0] : listVec;

            /* Again, take a chill pill ts */
            await (this.listColours as (msg: Discord.Message) => Promise<boolean>)(listMsg);
        }

        listReply
            .delete()
            .catch(e => null);

        msg.edit(
            stripIndents`Alright, initiation procedures completed!
            
            To add existing roles to bot, use 
            \`${prefix}setcolour colour_name role_name\`
            
            You can mention roles or just search by name.
            However if there are mutliple results for a role, bot will not add it.
            Make sure the role search result is unique.

            To quickly add a new colour to the bot, use
            \`${prefix}quickcolour colour_name colour_hex_code\`

            It is recommended to pin this message for reference for other admins.
            `,
        );

        const prompt = await <Promise<Discord.Message>>message.channel.send(
            stripIndents
            // tslint:disable-next-line:max-line-length
            `__It is also recommended you run ${prefix}cycle if you already have colour roles set up__.
            An admin can do this for you, if you wish.`,
        );

        prompt.delete(7500);

        confirm(message, 'success')
            .catch(e => null);
        return true;
    }

    /**
     * A helper utility for servers that already have colour roles.
     * It'll loop through each role, allowing the user to specify if
     * they want to add a role, and allows them to set a name for it.
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private cycleExistingRoles: CommandFunction = async (
        message,
    ) => {
        const roles = message.guild.roles;
        const { author } = message;
        // const testSpecial = (role: Discord.Role) => {
        //     return (
        //         role.hasPermission('ADMINISTRATOR')   ||
        //         role.hasPermission('KICK_MEMBERS')    ||
        //         role.hasPermission('BAN_MEMBERS')     ||
        //         role.hasPermission('MANAGE_CHANNELS') ||
        //         role.hasPermission('MANAGE_GUILD')    ||
        //         role.hasPermission('MANAGE_MESSAGES') ||
        //         role.hasPermission('')
        //     )    
        // }

        const guildRepo = await this.connection.getRepository(Guild);
        const guild = 
               await guildRepo.findOneById(message.guild.id)
            || await createGuildIfNone(message);

        const chan = <Discord.TextChannel>message
            .guild
            .channels
            .find('id', guild.channel);

        if (guild.channel === undefined || chan === undefined) {
            confirm(
                message, 
                'failure', 
                'Set a colour channel before running this command!', 
                { delete: true, delay: 3000 },
            );
            return;
        }

        const baselinePerms = 
            Object
                .entries(
                    roles
                    .find('id', message.guild.id)
                    .serialize(),
                )
                .filter(([role, has]) => has)
                .map(([role, has]) => role);

        const msg = await <Promise<Discord.Message>>message.channel.send(
            stripIndents`
            Welcome! This command will cycle through all existing roles to add them to the bot.
            You can choose the name for each colour after a confirmation.
            It is recommended you run this command in a mod channel.
            Would you like to continue? (\`y\` or \`n\`)`,
        );

        const reply = await this.getNextReply(message, author);

        if (reply.content.toLowerCase().startsWith('n')) {
            reply.delete();
            confirm(message, 'failure', 'Function was aborted by user!');
            return;
        }

        reply.delete();

        for (const [id, role] of roles) {
            if (role.managed) {
                msg.edit('Skipping managed role...');
                sleep(1000);
                continue;
            }

            const permissions = 
                Object
                    .entries(role.serialize())
                    .filter(([role, has]) => has)
                    .map(([role, has]) => role);

            const embed = new Discord.RichEmbed()
                .setColor(role.color)
                .setTitle(`Role: ${role.name}`)
                .addField(
                    'Confirm', 
                    oneLineTrim`
                    Would you like to add this role? 
                    (\`y\` or \`n\` or \`cancel\` or \`finish\`)`,
                )
                .setDescription('The colour for this role is the highlight on the side.')
                .addField(
                    'Warnings',
                    (baselinePerms.length < permissions.length
                     || role.name === '@everyone') 
                        ? '❌ Warning. This role may have special permissions!'
                        : '☑️ This role looks fine!',
                );

            msg.edit({ embed });

            const reply = await this.getNextReply(message, author);
            // TODO: fix for lower case and also adjust list.
            if (reply.content.toLowerCase().toLowerCase().startsWith('n')) {
                reply.delete();
                continue;
            }

            if (reply.content.toLowerCase().startsWith('cancel')) {
                confirm(message, 'failure', 'Function was canceled!');
                msg.delete();
                reply.delete();
                return;
            }

            if (reply.content.toLowerCase().startsWith('finish')) {
                reply.delete();
                msg.delete();
                break;
            }

            reply.delete();

            const setName = new Discord.RichEmbed()
                .setColor(role.color)
                .addField('Name', 'Type in the color name for this role.')
                .addField('Default', `To set as ${role.name}, type =default`, true)
                .addField('Cancel', 'To cancel, type =cancel', true);
            

            msg.edit({ embed: setName });

            const name = await this.getNextReply(message, author);

            if (name.content.toLowerCase().startsWith('=cancel')) {
                name.delete();
                continue;
            }

            this.setColourEntity(
                name.content.toLowerCase().startsWith('=default') 
                    ? role.name
                    : name.content,
                guild,
                role.id,
                name,
                true,
                true,
            );
            name.delete();
        }

        const generator = await <Promise<Discord.Message>>chan.send('Generating colours...!');
        this.updateOrListColours(generator);
        
        msg.edit(`Wohoo, that's all the roles!`);
        msg.delete(2000);
        confirm(message, 'success');

        return true;
    }

    /**
     * 
     * Helper method for getting a user reply.
     * 
     * @private
     * @param {Discord.Message} message 
     * @param {Discord.User} author 
     * @returns 
     * @memberof Colourizer
     */
    private async getNextReply (message: Discord.Message, author: Discord.User) {
        const reply = await message.channel.awaitMessages(
            msg => msg.author.id === author.id, 
            {
               maxMatches: 1,
            },
        );
        return reply.first();
    }
}
