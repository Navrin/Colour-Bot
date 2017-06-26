import { createNewColour } from './database/colour/actions';
import { getConnectionManager, Connection } from 'typeorm';
import { CommandFunction, CommandDefinition, RoleTypes } from 'simple-discordjs';
import { Guild } from './database/guild/model';
import { Colour } from './database/colour/model';
import { createGuildIfNone } from './database/guild/actions';
import { User } from './database/user/model';
import { createUserIfNone, setColourToUser } from './database/user/actions';
import * as yaml from 'js-yaml';
import * as Discord from 'discord.js';
import { stripIndents, oneLineTrim } from "common-tags";

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
                        await this.getColour(
                            message, 
                            options, 
                            {
                                ...params,
                                named: {
                                    ...params.named,
                                    colour: res[0],
                                }
                            }, 
                            client, true)
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
            const msg = await message.channel.send(`Searching colours...`)
            const results = await colourRepo
                .createQueryBuilder('colour')
                .innerJoin('colour.guild', 'guild')
                .where('colour.guild = :guildID', { guildID: parseInt(message.guild.id, 10) })
                .getMany();

            const yamler = yaml.dump(results.map((colourItem) => {
                return {
                    name: colourItem.name,
                }
            }));

            const searchMsg = (Array.isArray(msg)) ? msg[0] : msg;
            searchMsg.edit(yamler);
            return true;
        } catch (e) {
            return false;
        }
    }

    private getColour: CommandFunction = async (message, options, parameters: { array: string[], named: { colour: string } }, client, silent: boolean = false) => {
        const colourRepo = await this.connection.getRepository(Colour);
        const userRepo = await this.connection.getRepository(User);
        const colour = await colourRepo.createQueryBuilder('colour')
            .innerJoin('colour.guild.id', 'guild')
            .where('colour.guild = :guildId', { guildId: parseInt(message.guild.id, 10) })
            .andWhere('colour.name LIKE :colourName', { colourName: `%${parameters.named.colour}` })
            .getOne();


        if (colour == null) {
            if (!silent) {
                message.channel.send(`Colour was not found. Check your spelling of the colour, else ask an admin to add the colour.`);
            }
            return false;
        }

        const userEntitiy = await userRepo.findOneById(parseInt(message.author.id, 10))
            || await createUserIfNone(message.author, this.connection, colour);

        const userList = await userRepo.find({
            alias: 'user',
            innerJoinAndSelect: {
                'colour': 'user.colour'
            }
        });

        const user = userList[0];

        return await setColourToUser(colour, this.connection, user, message);
    }

    private setColour: CommandFunction = async (message, options, parameters: { array: string[], named: { colour: string, role: string } }) => {
        const guildRepo = await this.connection.getRepository(Guild);
        const colourRepo = await this.connection.getRepository(Colour);


        const roleID = this.findRole(message, parameters.named.role);
        if (!roleID) {
            message.channel.send(`No usable roles could be found! Mention a role or redefine your search parameters.`);
            return false;
        }

        const guild = await guildRepo.findOneById(parseInt(message.guild.id, 10))

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
                message.channel.send(`Colour wasn't created. Aborting function...`);
                return false;
            }

            if (!silent) {
                message.channel.send('Colour has successfully been added to the list!');
            }
            return true;
        }

        try {
            colour.guild = guild;
            colour.roleID = roleID;

            await colourRepo.persist(colour);
            await guildRepo.persist(guild);

            if (!silent) {
                message.channel.send(`Colour role has successfully been updated!`);
            }

            return true;
        } catch (e) {
            message.channel.send(`Error when updating colour: ${e.toString()}`);
            return false;
        }
    }

    private findRole(message: Discord.Message, role: string): string | false {
        const roleKey = message.mentions.roles.firstKey();

        if (roleKey) {
            return roleKey;
        }

        const search = message.guild.roles.filter((roleObject) =>
            roleObject.name.includes(role)
        );

        if (search.size > 1) {
            message.channel.send(
                stripIndents`Multiple results found for the search ${role}!
            Expected one role, found: 

            ${
                    search
                        .map(roleOjb => `Rolename: ${roleOjb.name.replace('@', '')}`)
                        .join('\n')
                    }`);
            return false;
        }

        return search.firstKey();
    }

    private generateStandardColours: CommandFunction = async (message) => {

        for (const [colourName, colourCode] of Object.entries(standardColours)) {
            const discordGuild = message.guild;
            const oldRole = await discordGuild.roles.find("name", `colour-${colourName}`);
            const role = (oldRole) ? oldRole : await discordGuild.createRole({ name: `colour-${colourName}`, color: colourCode });

            if (!role) {
                continue;
            }
            const guildRepo = await this.connection.getRepository(Guild);

            const guild = await guildRepo.findOneById(parseInt(discordGuild.id, 10))
                || await createGuildIfNone(message);

            if (!guild) {
                message.channel.send('Error when setting roles, guild not part of the current database.');
                break;
            }

            this.setColourEntity(`colour-${colourName}`, guild, role.id, message, true);
        }

        message.channel.send('Colours have been added (or regenerated)!');
        return true;
    }
}