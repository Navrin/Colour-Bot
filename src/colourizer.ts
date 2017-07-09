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
import { dispatch } from './dispatch';
import { JSDOM } from 'jsdom';
import { confirm } from './emojis';
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
                    if (res && !message.content.startsWith(prefix)) {
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

    /*********************
     * COMMAND FUNCTIONS *
     *********************/

    /**
     * Create a list of colours currently in the guild schema
     * // TODO Create a singleton message for each guild that can be pinned
     * // TODO Have the singleton automatically be edited on colour changes.
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

    private async createNewColourSingleton(message: Discord.Message, guild: Guild) {
        this.singletonInProgress = true;
        const msg = await message.channel.send(
`The following message will be edited to a list of colours for this guild.
These colours will automatically update on colour change.
__Please do not delete this message__
As images cannot be edited, do not pin the message, \
but the colour bot should maintain a clean (enough) \ 
channel history to keep the message at the top.`,
        );

        const singleMsg = Array.isArray(msg) ? msg[0] : msg;
        const guildRepo = await this.connection.getRepository(Guild);
        guild.listmessage = singleMsg.id;
        guildRepo.persist(guild);

        await sleep(7000);

        await this.syncColourList(singleMsg);
        confirm(message, 'success'); 
        this.singletonInProgress = false;
    }

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
        `<html>
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
                            width: 50%; 
                            float: left;
                            background-color: white;
                            color: ${colour}"> 
                            <span style="padding-left: 15px;">
                                ${item.name.replace('colour-', '')} 
                            </span>
                        </div>
                        <div style="
                            width: 50%; 
                            background-color: ${colour}; 
                            color: #${(0xFFFFFF - guildRole.color).toString(16)};
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
                            width: 50%; 
                            float: left;
                            color: ${colour}"> 
                            ${item.name.replace('colour-', '')} 
                        </div>
                        <div style="
                            width: 50%; 
                            background-color: ${colour}; 
                            color: #${(0xFFFFFF - guildRole.color).toString(16)};
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
                await confirm(message, 'failure', 'Colour was not found. Check your spelling \
of the colour, else ask an admin to add the colour.');
            }
            return false;
        }

        const userEntitiy = await findUser(message.author.id, guild, this.connection)
            || await createUserIfNone(message.author, guild, this.connection, colour);

        if (userEntitiy === undefined) {
            await confirm(message, 'failure', 'Error when creating user.');
            return;
        }

        const user = await userRepo
            .createQueryBuilder('user')
            .innerJoin('user.guild', 'guild', 'user.guild = guild.id')
            .innerJoin('user.colour', 'colour', 'user.colour = colour.id')
            .where('user.id = :userid', { userid: userEntitiy.id })
            .getOne();

        if (user == null) {
            message.channel.send('User is not in schema: ', user);
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

            if (user.colour !== undefined) {
                const oldColour = message.guild.roles.get(user.colour.roleID);

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

            user.colour = newColour;

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
            confirm(message, 'failure',  `error: ${e}`);
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
            await confirm(message, 'failure',`No usable roles could be found! \
Mention a role or redefine your search parameters.`);
            return false;
        }

        const guild = await guildRepo.findOneById(message.guild.id);

        if (guild === undefined) {
            const newGuild = await createGuildIfNone(message);
            this.setColourEntity(parameters.named.colour, newGuild, roleID, message);
            return true;
        }


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
                await confirm(message, 'failure', 'Error when setting roles,\
guild not part of the current database.');
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
}
