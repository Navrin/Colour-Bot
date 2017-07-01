"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const simple_discordjs_1 = require("simple-discordjs");
const Discord = require("discord.js");
const getInviteLink = (message, opts, params, client) => __awaiter(this, void 0, void 0, function* () {
    const invite = yield client.generateInvite([
        'MANAGE_ROLES',
        'READ_MESSAGES',
        'SEND_MESSAGES',
        'MANAGE_MESSAGES'
    ]);
    const embed = new Discord.RichEmbed()
        .setURL(invite)
        .setTitle('Bot Invite Link.')
        .setColor(0xff0000)
        .setDescription(invite);
    yield message.channel.send({
        embed,
    });
    return true;
});
const getInviteLinkDescriber = () => {
    return {
        command: {
            action: getInviteLink,
            names: ['invite', 'getinvite'],
        },
        authentication: simple_discordjs_1.RoleTypes.ADMIN,
        description: {
            message: 'Get an invite link for the bot with the needed permissions',
            example: '{{{prefix}}}invite',
        },
    };
};
exports.getInviteLinkDescriber = getInviteLinkDescriber;
