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
const confirmer_1 = require("./confirmer");
const GuildHelper_1 = require("./helpers/GuildHelper");
const GuildController_1 = require("./controllers/GuildController");
const guild_1 = require("./models/guild");
class ChannelLocker {
    constructor(connection) {
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
            return (yield this.testGuild(message)) || false;
        });
        this.testGuild = (message) => __awaiter(this, void 0, void 0, function* () {
            const guild = yield this.guildHelper.findOrCreateGuild(message.guild.id);
            if (!guild) {
                confirmer_1.confirm(message, 'failure', 'Error when finding guild.');
                return false;
            }
            if (guild.channel === message.channel.id) {
                return true;
            }
        });
        this.setChannel = (message, option, parameters, client) => __awaiter(this, void 0, void 0, function* () {
            const guild = yield this.guildHelper.findOrCreateGuild(message.guild.id);
            if (!guild) {
                confirmer_1.confirm(message, 'failure', 'Error when getting guild, please contact your bot maintainer');
                return false;
            }
            if (message.mentions.channels.first()) {
                const channels = message.mentions.channels;
                guild.channel = channels.first().id;
                yield this.connection.getRepository(guild_1.Guild)
                    .persist(guild);
            }
            else {
                const channel = message.guild.channels.find('name', parameters.named.channel);
                if (!channel) {
                    confirmer_1.confirm(message, 'failure', 'No channel found with the name' + parameters.named.channel);
                    return false;
                }
                this.guildController.update(guild.id, {
                    channel: channel.id,
                });
            }
            confirmer_1.confirm(message, 'success');
            return true;
        });
        this.connection = connection;
        this.guildHelper = new GuildHelper_1.default(this.connection);
        this.guildController = new GuildController_1.default(this.connection);
    }
}
exports.default = ChannelLocker;
