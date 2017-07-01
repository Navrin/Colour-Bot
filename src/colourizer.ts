import { createNewColour } from './database/colour/actions';
import { getConnectionManager, Connection } from 'typeorm';
import { CommandFunction, CommandDefinition, RoleTypes } from 'simple-discordjs';
import { Guild } from './database/guild/model';
import { Colour } from './database/colour/model';
import { createGuildIfNone } from './database/guild/actions';
import { User } from './database/user/model';
import { createUserIfNone, setColourToUser, findUser } from './database/user/actions';
import * as yaml from 'js-yaml';
import * as Discord from 'discord.js';
import { stripIndents, oneLineTrim } from 'common-tags';
import { dispatch } from './dispatch';

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
                action: async (message, options, params, client) => {
                    const res = new RegExp(`[a-zA-Z\s]+`).exec(message.content);
                    if (res && !message.content.startsWith(prefix)) {
                        await this
                            .getColour(
                            message, options, {
                                ...params,
                                named: { ...params.named,colour: res[0] },
                            }, 
                            client);
                    }
                    return false;
                },
                names: ['colourdirty'],
                noPrefix: true,
                pattern: /[a-zA-Z\s]+/,
            },
            custom: {
                locked: true,
            },
        };
    }

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
                const channel = <Discord.TextChannel>message
                    .guild
                    .channels
                    .find('id', guild.channel);

                if (!channel) {
                    message.channel.send('use setchannel to create a colour channel.');
                    return false;
                }

                const msg = await channel.fetchMessage(guild.listmessage);
                if (!msg) {
                    this.createNewColourSingleton(message, guild);
                }

                this.syncColourList(msg);
                return true;
            }


            this.createNewColourSingleton(message, guild);
    }

    private async createNewColourSingleton(message: Discord.Message, guild: Guild) {
        const msg = await message.channel.send(
`The following message will be edited to a list of colours for this guild.
These colours will automatically update on colour change.
__Please do not delete this message__
Pin it if you wish, but the colour bot should maintain a clean (enough) channel history.`,
        );

        const singleMsg = Array.isArray(msg) ? msg[0] : msg; 
        const guildRepo = await this.connection.getRepository(Guild);
        guild.listmessage = singleMsg.id;
        guildRepo.persist(guild);

        await sleep(3000);

        this.syncColourList(singleMsg);
    }

    private async syncColourList(message: Discord.Message) {
        const colourRepo = await this.connection.getRepository(Colour);
        const results = await colourRepo
            .createQueryBuilder('colour')
            .innerJoin('colour.guild', 'guild')
            .where('colour.guild = :guildID', { guildID: message.guild.id })
            .getMany();
        const yamler = yaml.dump(results.map((colourItem) => {
            return {
                name: colourItem.name.replace('colour-', ''),
            };
        }));

        message.edit(yamler);
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
            silent: boolean = false,
        ) => {
        const colourRepo = await this.connection.getRepository(Colour);
        const userRepo = await this.connection.getRepository(User);
        const guildRepo = await this.connection.getRepository(Guild);
        
        const colour = await colourRepo.createQueryBuilder('colour')
            .innerJoin('colour.guild.id', 'guild')
            .where('colour.guild = :guildId', { guildId: message.guild.id })
            .andWhere('colour.name LIKE :colourName', { colourName: `%${parameters.named.colour}` })
            .getOne();

        const guild = await guildRepo.findOneById(message.guild.id);

        if (guild == null) {
            await dispatch(message, 'Guild Error.');
            return false;
        }

        if (colour == null) {
            if (!silent) {
                await dispatch(message, 'Colour was not found. Check your spelling\
of the colour, else ask an admin to add the colour.');
            }
            return false;
        }

        const userEntitiy = await findUser(message.author.id, guild, this.connection)
            || await createUserIfNone(message.author, guild, this.connection, colour);

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

        return await setColourToUser(colour, this.connection, user, guild, message);
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
            await dispatch(message, `No usable roles could be found! \
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
            silent: boolean = false) {
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
                dispatch(message, `Colour wasn't created. Aborting function...`);
                return false;
            }

            if (!silent) {
                dispatch(message, 'Colour has successfully been added to the list!');
            }

            this.updateOrListColours(message);
            return true;
        }

        try {
            colour.guild = guild;
            colour.roleID = roleID;

            await colourRepo.persist(colour);
            await guildRepo.persist(guild);

            if (!silent) {
                dispatch(message, `Colour role has successfully been updated!`);
            }

            this.updateOrListColours(message);
            return true;
        } catch (e) {
            dispatch(message, `Error when updating colour: ${e.toString()}`);
            return false;
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
            await dispatch(message, 
                           stripIndents`Multiple results found for the search ${role}!
            Expected one role, found: 

            ${
                    search
                        .map(roleOjb => `Rolename: ${roleOjb.name.replace('@', '')}`)
                        .join('\n')
                    }`,    undefined, { delete: false });
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
                await dispatch(message, 'Error when setting roles,\
guild not part of the current database.');
                return false;
            }

            this.setColourEntity(`colour-${colourName}`, guild, role.id, message, true);
        }

        await dispatch(message, 'Colours have been added (or regenerated)!');
        return true;
    }

    /**
     * Quick utility method for mods to create a new colour role quickly.
     * c.quickcolour {{name}} {{colour_code}}
     * // TODO allow colour code to accept a #
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colour>:(izer
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
            await dispatch(message, 'No colour was specified');
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
}
