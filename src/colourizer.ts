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
import { stripIndents, oneLineTrim } from "common-tags";
import { dispatch } from './dispatch';

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

    public getSetCommand: () => CommandDefinition = () => {
        return {
            authentication: RoleTypes.ADMIN,
            command: {
                action: this.setColour,
                names: ['setcolor', 'setcolour'],
                parameters: '{{colour}} {{role}}'
            },
            description: {
                message: 'Sets a role colour to be registered. If no roles are mentions, perform a search for a role by name, and if more than one role is found, specify role name further.',
                example: '{{{prefix}}}setcolour green @role \n {{{prefix}}}setcolour green role_name_here',
            }
        }
    }

    public getColourCommand: () => CommandDefinition = () => {
        return {
            command: {
                action: this.getColour,
                names: ['colour', 'addcolour', 'getcolour', 'color', 'addcolor', 'getcolor', ''],
                parameters: '{{colour}}'
            },
            custom: {
                locked: true,
            },
            description: {
                message: 'Set a colour role to yourself',
                example: '{{{prefix}}}getcolour green'
            }
        }
    }

    public getDirtyColourCommand: () => CommandDefinition = () => {
        return {
            command: {
                action: async (message, options, params, client) => {
                    const res = /[a-zA-Z\s]+/.exec(message.content);
                    if (res) {
                        await this.getColour(message, options, {
                                ...params,
                                named: {
                                    ...params.named,
                                    colour: res[0],
                                }
                            },  client, true)
                    }
                    return false;
                },
                names: ['colourdirty'],
                noPrefix: true,
                pattern: /[a-zA-Z\s]+/,
            },
            custom: {
                locked: true,
            }
        }
    }

    public getQuickColourCommand: () => CommandDefinition = () => {
        return {
            command: {
                action: this.quickCreateColour,
                names: ['quickcolour', 'makecolour', 'quickcolor', 'makecolor'],
                parameters: '{{colourName}} {{colourCode}}'
            },
            authentication: RoleTypes.ADMIN,
            description: {
                message: 'Generate a new colour quickly with a hex code',
                example: '{{{prefix}}}quickcolour red FF0000',
            }
        }
    }

    public getListCommand: () => CommandDefinition = () => {
        return {
            command: {
                action: this.listColours,
                names: ['allcolours', 'colours', 'allcolors', 'colors'],
            },
            description: {
                message: 'Lists all all the avaliable colours in a yaml format.',
                example: '{{{prefix}}}colours'
            },
            custom: {
                locked: true,
            }
        }
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
            }
        };
    }

    private listColours: CommandFunction = async (message) => {
        try {
            const colourRepo = await this.connection.getRepository(Colour);
            const msg = await await dispatch(message, `Searching colours...`)
            const results = await colourRepo
                .createQueryBuilder('colour')
                .innerJoin('colour.guild', 'guild')
                .where('colour.guild = :guildID', { guildID: message.guild.id })
                .getMany();

            const yamler = yaml.dump(results.map((colourItem) => {
                return {
                    name: colourItem.name,
                }
            }));

            const searchMsg = (Array.isArray(msg)) ? msg[0] : msg;
            await dispatch(searchMsg, yamler, undefined, { edit: true, delete: false });
            return true;
        } catch (e) {
            return false;
        }
    }

    private getColour: CommandFunction = async (message, options, parameters: { array: string[], named: { colour: string } }, client, silent: boolean = false) => {
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
                await dispatch(message, `Colour was not found. Check your spelling of the colour, else ask an admin to add the colour.`);
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

    private setColour: CommandFunction = async (message, options, parameters: { array: string[], named: { colour: string, role: string } }) => {
        const guildRepo = await this.connection.getRepository(Guild);
        const colourRepo = await this.connection.getRepository(Colour);


        const roleID = await this.findRole(message, parameters.named.role);
        if (!roleID) {
            await dispatch(message, `No usable roles could be found! Mention a role or redefine your search parameters.`);
            return false;
        }

        const guild = await guildRepo.findOneById(message.guild.id)

        if (guild === undefined) {
            const newGuild = await createGuildIfNone(message);
            this.setColourEntity(parameters.named.colour, newGuild, roleID, message);
            return true;
        }


        this.setColourEntity(parameters.named.colour, guild, roleID, message);
        return true;
    }

    private async setColourEntity(colourName: string, guild: Guild, roleID: string, message: Discord.Message, silent: boolean = false) {
        const colourRepo = await this.connection.getRepository(Colour);
        const guildRepo = await this.connection.getRepository(Guild);

        const colour = await colourRepo
            .createQueryBuilder('colour')
            .innerJoin('colour.guild', 'guild')
            .where('colour.guild = :guildID', { guildID: guild.id })
            .andWhere('colour.name LIKE :colourName', { colourName: colourName })
            .getOne();

        if (colour == undefined) {
            const newColour = await createNewColour(message, colourName, roleID);
            if (!newColour) {
                await dispatch(message, `Colour wasn't created. Aborting function...`);
                return false;
            }

            if (!silent) {
                await dispatch(message, 'Colour has successfully been added to the list!');
            }
            return true;
        }

        try {
            colour.guild = guild;
            colour.roleID = roleID;

            await colourRepo.persist(colour);
            await guildRepo.persist(guild);

            if (!silent) {
                await dispatch(message, `Colour role has successfully been updated!`);
            }

            return true;
        } catch (e) {
            await dispatch(message, `Error when updating colour: ${e.toString()}`);
            return false;
        }
    }

    private async findRole(message: Discord.Message, role: string): Promise<string | false> {
        const roleKey = message.mentions.roles.firstKey();

        if (roleKey) {
            return roleKey;
        }

        const search = message.guild.roles.filter((roleObject) =>
            roleObject.name.includes(role)
        );

        if (search.size > 1) {
            await dispatch(message, 
                stripIndents`Multiple results found for the search ${role}!
            Expected one role, found: 

            ${
                    search
                        .map(roleOjb => `Rolename: ${roleOjb.name.replace('@', '')}`)
                        .join('\n')
                    }`, undefined, { delete: false });
            return false;
        }

        return search.firstKey();
    }

    private generateStandardColours: CommandFunction = async (message) => {

        for (const [colourName, colourCode] of Object.entries(standardColours)) {
            const discordGuild = message.guild;
            const oldRole = await discordGuild.roles.find('name', `colour-${colourName}`);
            const role = (oldRole) ? oldRole : await discordGuild.createRole({ name: `colour-${colourName}`, color: colourCode });

            if (!role) {
                continue;
            }
            const guildRepo = await this.connection.getRepository(Guild);

            const guild = await guildRepo.findOneById(discordGuild.id)
                || await createGuildIfNone(message);

            if (!guild) {
                await dispatch(message, 'Error when setting roles, guild not part of the current database.');
                return false;
            }

            this.setColourEntity(`colour-${colourName}`, guild, role.id, message, true);
        }

        await dispatch(message, 'Colours have been added (or regenerated)!');
        return true;
    }

    private quickCreateColour: CommandFunction = async (message, options, params: {
        array: string[],
        named: {
            colourName: string,
            colourCode: string,
        }
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
               color: parseInt(colourCode, 16),
           });

        this.setColourEntity(params.named.colourName, guild, colourEntity.id, message);

        return true;
    }
}