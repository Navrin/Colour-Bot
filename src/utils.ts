import { RoleTypes } from 'simple-discordjs';
import { CommandDefinition, CommandFunction} from 'simple-discordjs';
import * as Discord from 'discord.js';


const getInviteLink: CommandFunction = async (message, opts, params, client) => {
    const invite = await client.generateInvite(['MANAGE_ROLES', 'READ_MESSAGES', 'SEND_MESSAGES', 'MANAGE_MESSAGES']);

    const embed = new Discord.RichEmbed()
        .setURL(invite)
        .setTitle('Bot Invite Link.')
        .setColor(0xff0000)
        .setDescription(invite);
    
    await message.channel.send({
        embed,
    });

    return true;
}

const getInviteLinkDescriber: () => CommandDefinition = () => {
    return {
        command: {
            action: getInviteLink,
            names: ['invite', 'getinvite']
        },
        authentication: RoleTypes.ADMIN,
        description: {
            message: 'Get an invite link for the bot with the needed permissions',
            example: '{{{prefix}}}invite',
        }
    }
}

export {
    getInviteLinkDescriber
}
