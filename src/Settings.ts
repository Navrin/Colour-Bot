import { CommandDefinition, RoleTypes, CommandFunction } from 'simple-discordjs';
import { Connection } from 'typeorm';
import * as Discord from 'discord.js';
import { confirm } from './confirmer';
import GuildHelper from './helpers/GuildHelper';
import GuildController from './controllers/GuildController';
import { defaultGuildSettings } from './models/guild';

export
enum Types {
    bool = 'boolean',
    num = 'number',
    str = 'string',
}

interface SettingSchema {
    [key: string]: {
        type: Types | undefined,
        aliases: string[],
        description: string,
    };
}

export default
class Settings {
    guildControler: GuildController;
    guildHelper: GuildHelper;
    connection: Connection;
    settings: SettingSchema;
    
    constructor(connection: Connection, settings: SettingSchema) {
        this.connection = connection;
        this.settings = settings;
        this.guildHelper = new GuildHelper(this.connection);
        this.guildControler = new GuildController(this.connection);
    }

    public getSetCommand: () => CommandDefinition = () => ({
        command: {
            action: this.modifySetting,
            names: ['set', 'setting', 'modsettings'],
            parameters: '{{setting}} {{value}}',
        }, 
        authentication: RoleTypes.ADMIN,
        description: {
            message: 'Sets a server setting to the specified value',
            example: '{{{prefix}}}colourdelta 5',
        },
    })

    public getListSettingsCommand: () => CommandDefinition = () => ({
        command: {
            action: this.listSettings,
            names: ['list', 'listsettings', 'settings'],
        },
        authentication: RoleTypes.ADMIN,
        description: {
            message: 'List all possibile settings an admin can set',
            example: '{{{prefix}}}list',
        },
    })

    listSettings: CommandFunction = async (message, o, p, client) => {
        const embed = new Discord.RichEmbed()
            .setTitle('All settings: ')
            .setThumbnail(client.user.avatarURL);

        for (const [key, value] of Object.entries(this.settings)) {
            const accepted = 
                (value.type === Types.bool) 
                    ? 'true or false'
                    : `any ${(value.type === Types.num) ? 'number value' : 'string'}`;

            embed.addField(
                `${key} (aliases: ${value.aliases.join(', ')})`, 
                `${value.description} - Accepts values: ${accepted}`, 
            );
        }

        message.channel.send({ embed }).then((msg: Discord.Message) => msg.delete(20000));
        message.delete();

    }

    modifySetting: CommandFunction = async (message, opts, params: {
        array: string[],
        named: {
            setting: string,
            value: string,
        },
    }) => {
        for (const [setting, descriptor] of Object.entries(this.settings)) {
            if (descriptor.aliases.includes(params.named.setting.toLowerCase())
                || setting.toLowerCase() === params.named.setting.toLowerCase()) {
                    const validated = this.validate(params.named.value, descriptor.type);
                    
                    if (!validated) {
                        confirm(message, 'failure', 'Bad value given!');
                        return;
                    }
                    
                    const result = await this.set(message, setting, params.named.value);
                    if (result) {
                        confirm(message, 'success');
                        return;
                    }
            }
        }
        confirm(
            message, 
            'failure', 
            'No setting was found! Consider using the listsettings command.',
        );
    }

    validate(value: string, type: Types | undefined) {
        const lowered = value.toLowerCase();

        switch (type) {
            case Types.bool:
                return /(false|true)/i.test(lowered);
            case Types.num:
                return !(/[\D]+/i.test(lowered));
            case Types.str:
                return !(/[\d]+/i.test(lowered));
            default: 
                return true;
        }       
    }

    async set(message: Discord.Message, setting: string, value: string): Promise<boolean> {
        const type = this.settings[setting].type;
        
        if (type === undefined) {
            confirm(message, 'failure', 'Type schema and alias schema mismatch!');
            return false;
        }

        const converted = this.convertValue(value, this.settings[setting].type);

        const guildEntity = await this.guildHelper.findOrCreateGuild(message.guild.id);
        const settings = guildEntity.settings || defaultGuildSettings;

        try {
            const updatedGuild = await this.guildControler.update(guildEntity.id, {
                settings: {
                    ...settings,
                    [setting]: converted,
                },
            });
    
            return true;
        } catch (e) {
            // people dont know how to set stuff
            return false;
        }
    }

    convertValue(value: string, type: Types | undefined) {
        switch (type) {
            case Types.bool:
                return value.toLowerCase() === 'true';
            case Types.num:
                return parseInt(value, 10);
            case Types.str:
                return value;
            default: 
                return value;
        }
    } 
}
