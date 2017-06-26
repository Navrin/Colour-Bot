import * as Discord from 'discord.js';
import { CommandFunction, CommandDefinition, RoleTypes, MiddlewareFunction } from 'simple-discordjs';
import { Guild } from './database/guild/model';
import { Connection, getConnectionManager} from 'typeorm';
import { createGuildIfNone } from './database/guild/actions';

export default
class ChannelLocker {
    connection: Connection;
    

    constructor() {
        this.connection = getConnectionManager().get();
    }

    public getSetChannelLock = (): CommandDefinition => {
        return {
            command: {
                action: this.setChannel,
                names: ['setchannel', 'setcolourchannel'],
                parameters: '{{channel}}'
            },
            authentication: RoleTypes.ADMIN,
            description: {
                message: 'Lock the bot to operate within the specified channel (OWNER ONLY)',
                example: '{{{prefix}}}setchannel #colour-requests',
            }
        }
    }    

    lock: MiddlewareFunction = async (message, options) => {
        if ('custom' in options && !options.custom.locked) {
            return true;
        }

        if (!('custom' in options)) {
            return true;
        }

        const guildRepo = this.connection.getRepository(Guild);        
        const guild = await guildRepo.findOneById(parseInt(message.guild.id, 10))
            || await createGuildIfNone(message);

        if (!guild) {
            message.channel.send('Error when finding guild.');
            return false;
        }

        if (guild.channel === message.channel.id) {
            return true;
        }

        return false;
    }

    private setChannel: CommandFunction = async (message, option, parameters: { array: string[], named: { channel: string} }, client) => {
        const guildRepo = await this.connection.getRepository(Guild);
        const guild = await guildRepo.findOneById(parseInt(message.guild.id))
            || await createGuildIfNone(message);

        if (!guild) {
            message.channel.send('Error when getting guild, please contact your bot maintainer');
            return false;
        }

        if (message.mentions.channels.first()) {
            const channels = message.mentions.channels;

            guild.channel = channels.first().id;
        } else {
            const channel = message.guild.channels.find('name', parameters.named.channel);
            if (!channel) {
                message.channel.send('No channel found with the name' + parameters.named.channel);
                return false;
            }

            guild.channel = channel.id;
        }

        await guildRepo.persist(guild);        
        message.channel.send('Channel has sucessfully been set.');
        return true;
    }
}