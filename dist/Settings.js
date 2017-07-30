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
const confirmer_1 = require("./confirmer");
const GuildHelper_1 = require("./helpers/GuildHelper");
const GuildController_1 = require("./controllers/GuildController");
const guild_1 = require("./models/guild");
var Types;
(function (Types) {
    Types["bool"] = "boolean";
    Types["num"] = "number";
    Types["str"] = "string";
})(Types = exports.Types || (exports.Types = {}));
class Settings {
    constructor(connection, settings) {
        this.getSetCommand = () => ({
            command: {
                action: this.modifySetting,
                names: ['set', 'setting', 'modsettings'],
                parameters: '{{setting}} {{value}}',
            },
            authentication: simple_discordjs_1.RoleTypes.ADMIN,
            description: {
                message: 'Sets a server setting to the specified value',
                example: '{{{prefix}}}colourdelta 5',
            },
        });
        this.getListSettingsCommand = () => ({
            command: {
                action: this.listSettings,
                names: ['list', 'listsettings', 'settings'],
            },
            authentication: simple_discordjs_1.RoleTypes.ADMIN,
            description: {
                message: 'List all possibile settings an admin can set',
                example: '{{{prefix}}}list',
            },
        });
        this.listSettings = (message, o, p, client) => __awaiter(this, void 0, void 0, function* () {
            const embed = new Discord.RichEmbed()
                .setTitle('All settings: ')
                .setThumbnail(client.user.avatarURL);
            for (const [key, value] of Object.entries(this.settings)) {
                const accepted = (value.type === Types.bool)
                    ? 'true or false'
                    : `any ${(value.type === Types.num) ? 'number value' : 'string'}`;
                embed.addField(`${key} (aliases: ${value.aliases.join(', ')})`, `${value.description} - Accepts values: ${accepted}`);
            }
            message.channel.send({ embed }).then((msg) => msg.delete(20000));
            message.delete();
        });
        this.modifySetting = (message, opts, params) => __awaiter(this, void 0, void 0, function* () {
            for (const [setting, descriptor] of Object.entries(this.settings)) {
                if (descriptor.aliases.includes(params.named.setting.toLowerCase())
                    || setting.toLowerCase() === params.named.setting.toLowerCase()) {
                    const result = yield this.set(message, setting, params.named.value);
                    if (result) {
                        confirmer_1.confirm(message, 'success');
                        return;
                    }
                }
            }
            confirmer_1.confirm(message, 'failure', 'No setting was found! Consider using the listsettings command.');
        });
        this.connection = connection;
        this.settings = settings;
        this.guildHelper = new GuildHelper_1.default(this.connection);
        this.guildControler = new GuildController_1.default(this.connection);
    }
    set(message, setting, value) {
        return __awaiter(this, void 0, void 0, function* () {
            const type = this.settings[setting].type;
            if (type === undefined) {
                confirmer_1.confirm(message, 'failure', 'Type schema and alias schema mismatch!');
                return false;
            }
            const converted = this.convertValue(value, this.settings[setting].type);
            const guildEntity = yield this.guildHelper.findOrCreateGuild(message.guild.id);
            const settings = guildEntity.settings || guild_1.defaultGuildSettings;
            const updatedGuild = yield this.guildControler.update(guildEntity.id, {
                settings: Object.assign({}, settings, { [setting]: converted }),
            });
            return true;
        });
    }
    convertValue(value, type) {
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
exports.default = Settings;
