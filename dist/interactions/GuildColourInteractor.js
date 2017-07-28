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
const GuildController_1 = require("../controllers/GuildController");
const ColourController_1 = require("../controllers/ColourController");
var GuildColourStatus;
(function (GuildColourStatus) {
    GuildColourStatus[GuildColourStatus["SUCCESS"] = 0] = "SUCCESS";
    GuildColourStatus[GuildColourStatus["SUCCESS_UPDATE_LIST"] = 1] = "SUCCESS_UPDATE_LIST";
    GuildColourStatus[GuildColourStatus["FAILURE"] = 2] = "FAILURE";
    GuildColourStatus[GuildColourStatus["FAILURE_UPDATE_LIST"] = 3] = "FAILURE_UPDATE_LIST";
})(GuildColourStatus = exports.GuildColourStatus || (exports.GuildColourStatus = {}));
class GuildColourInteractor {
    /**
     * Creates an instance of GuildColourInteractor.
     *
     * @param {Discord.Message} context
     * @param {Guild} guild
     * @memberof GuildColourInteractor
     */
    constructor(connection, context, guild) {
        this.guild = guild;
        this.context = context;
        this.discordGuild = context.guild;
        this.connection = connection;
        this.guildRepo = this.connection.getRepository(guild_1.Guild);
        this.guildController = new GuildController_1.default(connection);
        this.colourController = new ColourController_1.default(connection, this.guild);
    }
    /**
     * Creates a new colour role with the given name,
     * or updates the previously existing role.
     *
     * @param {Discord.Role} role
     * @memberof GuildColourInteractor
     */
    createOrUpdateColour(role, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingColour = yield this.colourController.find({ roleID: role.id });
            const colour = (existingColour)
                ? yield this.colourController.update(existingColour.id, {
                    name,
                })
                : yield this.colourController.create({
                    name,
                    roleID: role.id,
                });
            return {
                status: GuildColourStatus.SUCCESS_UPDATE_LIST,
                message: `Colour successfully ${(existingColour) ? 'updated' : 'created'}!`,
                data: colour,
                type: 'success',
            };
        });
    }
    /**
     * Removes a colour and it's associated discord guild role.
     *
     * @param {Colour} colour
     * @returns {Promise<GuildColourResponse>}
     * @memberof GuildColourInteractor
     */
    removeColour(colour) {
        return __awaiter(this, void 0, void 0, function* () {
            const guildColourRole = yield this.discordGuild.roles.get(colour.roleID);
            if (guildColourRole) {
                guildColourRole.delete();
            }
            const success = yield this.colourController.delete(colour.id);
            if (success) {
                return {
                    status: GuildColourStatus.SUCCESS_UPDATE_LIST,
                    message: 'Colour successfully deleted',
                    type: 'success',
                };
            }
            return {
                status: GuildColourStatus.FAILURE,
                message: 'Colour was not deleted!',
                type: 'failure',
            };
        });
    }
}
exports.default = GuildColourInteractor;
