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
const GuildController_1 = require("../controllers/GuildController");
const guild_1 = require("../models/guild");
class GuildHelper {
    constructor(connection) {
        this.connection = connection;
        this.controller = new GuildController_1.default(connection);
    }
    /**
     * Find an existing guild based on id or create a new one.
     *
     * @param {string} id
     * @memberof GuildHelper
     */
    findOrCreateGuild(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const repo = this.connection.getRepository(guild_1.Guild);
            const maybeGuild = yield repo.findOneById(id, {
                alias: 'guild',
                innerJoinAndSelect: {
                    colours: 'guild.colours',
                },
            });
            if (maybeGuild) {
                if (maybeGuild.settings === undefined) {
                    return yield this.controller.update(maybeGuild.id, {
                        settings: guild_1.defaultGuildSettings,
                    });
                }
                return maybeGuild;
            }
            const guild = new guild_1.Guild();
            guild.id = id;
            guild.settings = guild_1.defaultGuildSettings;
            guild.colours = [];
            const newGuild = yield repo.persist(guild);
            return newGuild;
        });
    }
}
exports.default = GuildHelper;
