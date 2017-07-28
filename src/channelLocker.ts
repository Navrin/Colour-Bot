import * as Discord from 'discord.js';
import {
    CommandFunction,
    CommandDefinition,
    RoleTypes,
    MiddlewareFunction,
} from 'simple-discordjs';
import { Connection, getConnectionManager } from 'typeorm';
import { confirm } from './confirmer';
import GuildHelper from './helpers/GuildHelper';
import GuildController from './controllers/GuildController';

export default
class ChannelLocker {
    guildHelper: GuildHelper;
    guildController: GuildController;
    connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
        this.guildHelper = new GuildHelper(this.connection);
        this.guildController = new GuildController(this.connection);
    }

    public getSetChannelLock = (): CommandDefinition => {
        return {
            command: {
                action: this.setChannel,
                names: ['setchannel', 'setcolourchannel'],
                parameters: '{{channel}}',
            },
            authentication: RoleTypes.ADMIN,
            description: {
                message: 'Lock the bot to operate within the specified channel (OWNER ONLY)',
                example: '{{{prefix}}}setchannel #colour-requests',
            },
        };
    }

    lock: MiddlewareFunction = async (message, options) => {
        if ('custom' in options && !options.custom.locked) {
            return true;
        }

        if (!('custom' in options)) {
            return true;
        }

        if (options.authentication && options.authentication > 0) {
            return true;
        }

        return await this.testGuild(message) || false;
    }

    public testGuild = async (message: Discord.Message) => {
        const guild = await this.guildHelper.findOrCreateGuild(message.guild.id);

        if (!guild) {
            confirm(message, 'failure', 'Error when finding guild.');
            return false;
        }

        if (guild.channel === message.channel.id) {
            return true;
        }
    }

    private setChannel: CommandFunction = async (
        message,
        option,
        parameters: { array: string[], named: { channel: string } },
        client,
    ) => {
        const guild = await this.guildHelper.findOrCreateGuild(message.guild.id);

        if (!guild) {
            confirm(
                message,
                'failure',
                'Error when getting guild, please contact your bot maintainer',
            );
            return false;
        }

        if (message.mentions.channels.first()) {
            const channels = message.mentions.channels;

            this.guildController.update(guild.id, {
                channel: channels.first().id,
            });
        } else {
            const channel = message.guild.channels.find('name', parameters.named.channel);
            if (!channel) {
                confirm(
                    message,
                    'failure',
                    'No channel found with the name' + parameters.named.channel,
                );
                return false;
            }

            this.guildController.update(guild.id, {
                channel: channel.id,
            });
        }

        confirm(message, 'success');
        return true;
    }
}
