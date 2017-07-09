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
const model_1 = require("./database/guild/model");
const typeorm_1 = require("typeorm");
const actions_1 = require("./database/guild/actions");
const emojis_1 = require("./emojis");
class ChannelLocker {
    constructor() {
        this.getSetChannelLock = () => {
            return {
                command: {
                    action: this.setChannel,
                    names: ['setchannel', 'setcolourchannel'],
                    parameters: '{{channel}}',
                },
                authentication: simple_discordjs_1.RoleTypes.ADMIN,
                description: {
                    message: 'Lock the bot to operate within the specified channel (OWNER ONLY)',
                    example: '{{{prefix}}}setchannel #colour-requests',
                },
            };
        };
        this.lock = (message, options) => __awaiter(this, void 0, void 0, function* () {
            if ('custom' in options && !options.custom.locked) {
                return true;
            }
            if (!('custom' in options)) {
                return true;
            }
            if (options.authentication && options.authentication > 0) {
                return true;
            }
            const guildRepo = this.connection.getRepository(model_1.Guild);
            const guild = (yield guildRepo.findOneById(message.guild.id))
                || (yield actions_1.createGuildIfNone(message));
            if (!guild) {
                emojis_1.confirm(message, 'failure', 'Error when finding guild.');
                return false;
            }
            if (guild.channel === message.channel.id) {
                return true;
            }
            return false;
        });
        this.setChannel = (message, option, parameters, client) => __awaiter(this, void 0, void 0, function* () {
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const guild = (yield guildRepo.findOneById(message.guild.id))
                || (yield actions_1.createGuildIfNone(message));
            if (!guild) {
                emojis_1.confirm(message, 'failure', 'Error when getting guild, please contact your bot maintainer');
                return false;
            }
            if (message.mentions.channels.first()) {
                const channels = message.mentions.channels;
                guild.channel = channels.first().id;
            }
            else {
                const channel = message.guild.channels.find('name', parameters.named.channel);
                if (!channel) {
                    emojis_1.confirm(message, 'failure', 'No channel found with the name' + parameters.named.channel);
                    return false;
                }
                guild.channel = channel.id;
            }
            yield guildRepo.persist(guild);
            emojis_1.confirm(message, 'success');
            return true;
        });
        this.connection = typeorm_1.getConnectionManager().get();
    }
}
exports.default = ChannelLocker;
