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
const guild_1 = require("../models/guild");
class GuildController {
    /**
     * Creates an instance of GuildController.
     * Controls guild DB interactions and updates.
     * @memberof GuildController
     */
    constructor(connection) {
        this.connection = connection;
        this.guildRepo = this.connection.getRepository(guild_1.Guild);
    }
    /**
     * Returns all the given guilds.
     * Helpful for superuser informations commands.
     * @returns
     * @memberof GuildController
     */
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.guildRepo.find();
        });
    }
    /**
     * Find a given guild via its name.
     * The name will be whatever name it was given
     * @param {string} name
     * @returns
     * @memberof GuildController
     */
    find(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const guild = yield this.guildRepo
                .createQueryBuilder('guild')
                .where('guild.name LIKE :name', { name })
                .getOne();
            return guild;
        });
    }
    /**
     * Find a given guild via it's discord ID snowflake.
     *
     * @param {string} id
     * @returns
     * @memberof GuildController
     */
    read(id, allRelations) {
        return __awaiter(this, void 0, void 0, function* () {
            if (allRelations) {
                const guild = yield this.guildRepo.findOneById(id, {
                    alias: 'guild',
                    innerJoinAndSelect: {
                        colours: 'guild.colours',
                    },
                });
                return guild;
            }
            const guild = yield this.guildRepo.findOneById(id);
            return guild;
        });
    }
    /**
     * Creates a new guild via an discord snowflake.
     *
     * @param {GuildCreatePayload} payload
     * @memberof GuildController
     */
    create(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const guild = new guild_1.Guild();
            guild.id = payload.id;
            guild.colours = [];
            guild.users = [];
            guild.requests = [];
            guild.settings = guild_1.defaultGuildSettings;
            const guildEntity = yield this.guildRepo.persist(guild);
            return guildEntity;
        });
    }
    /**
     * Iterates through the payload, merging the arrays and creating a new updated
     * guild, and persists it to the database.
     *
     * @param {string} id
     * @param {GuildUpdatePayload} payload
     * @returns
     * @memberof GuildController
     */
    update(id, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const guild = yield this.guildRepo.findOneById(id, {
                alias: 'guild',
                innerJoinAndSelect: {
                    colours: 'guild.colours',
                },
            });
            if (!guild) {
                throw new TypeError('Guild does not exist!');
            }
            for (const [key, value] of Object.entries(payload)) {
                if (Array.isArray(value)) {
                    // merge the original guild value array with the payload array.
                    guild[key] = [...guild[key], ...value];
                }
                else {
                    guild[key] = value;
                }
            }
            return yield this.guildRepo.persist(guild);
        });
    }
    /**
     * Find a guild based on it's discord snowflake and remove it.
     *
     * @param {string} id
     * @memberof GuildController
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const guild = yield this.read(id);
            if (!guild) {
                throw new TypeError('Guild does not exist!');
            }
            try {
                yield this.guildRepo.remove(guild);
                return true;
            }
            catch (e) {
                return false;
            }
        });
    }
}
exports.default = GuildController;
