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
const user_1 = require("../models/user");
const guild_1 = require("../models/guild");
const UserController_1 = require("../controllers/UserController");
const ColourController_1 = require("../controllers/ColourController");
var ColourStatusReturns;
(function (ColourStatusReturns) {
    ColourStatusReturns[ColourStatusReturns["SUCCESS"] = 0] = "SUCCESS";
    ColourStatusReturns[ColourStatusReturns["FAILURE"] = 1] = "FAILURE";
    ColourStatusReturns[ColourStatusReturns["FAILURE_UPDATE_LIST"] = 2] = "FAILURE_UPDATE_LIST";
})(ColourStatusReturns = exports.ColourStatusReturns || (exports.ColourStatusReturns = {}));
class UserColourInteractor {
    constructor(connection, context, guild) {
        this.discordGuild = context.guild;
        this.discordUser = context.author;
        this.message = context;
        this.connection = connection;
        this.userController = new UserController_1.default(connection);
        this.guild = guild;
        this.colourController = new ColourController_1.default(connection, this.guild);
        this.userRepo = this.connection.getRepository(user_1.User);
        this.guildRepo = this.connection.getRepository(guild_1.Guild);
        return this;
    }
    /**
     * Adds a colour to the given user.
     * Check if a user already has colours the bot can use,
     * if so, delete them.
     *
     * Returns an object that describes the result of the operation.
     *
     * @param {Colour} colour
     * @returns {(Promise<ColourReturnMessages>)}
     * @memberof UserColourInteractor
     */
    addColour(colour) {
        return __awaiter(this, void 0, void 0, function* () {
            const allColours = yield this.colourController.index();
            const colourRoleIds = allColours.map(c => c.roleID);
            const userWithGuildContext = this
                .discordGuild
                .member(this.discordUser);
            const allUserGuildColours = this.discordGuild.roles
                .filterArray(role => role.id !== colour.roleID
                && userWithGuildContext.roles.exists('id', role.id)
                && colourRoleIds.includes(role.id));
            yield userWithGuildContext.removeRoles(allUserGuildColours);
            const discordGuildColour = this.discordGuild.roles.get(colour.roleID);
            if (discordGuildColour === undefined) {
                this.colourController.delete(colour.id);
                return {
                    status: ColourStatusReturns.FAILURE_UPDATE_LIST,
                    message: 'Colour was removed from the guild, updating list...',
                    type: 'failure',
                };
            }
            try {
                yield userWithGuildContext.addRole(discordGuildColour);
                return {
                    status: ColourStatusReturns.SUCCESS,
                    message: 'Your colour has been set!',
                    type: 'success',
                };
            }
            catch (e) {
                return {
                    status: ColourStatusReturns.FAILURE,
                    message: `Failure setting colour due to: ${e}`,
                    type: 'failure',
                };
            }
        });
    }
    /**
     * Removes a current colour from the user.
     * If the user has no colour,
     *
     * @memberof UserColourInteractor
     */
    removeColourFromUser() {
        return __awaiter(this, void 0, void 0, function* () {
            const allColours = yield this.colourController.index();
            const colourRoleIds = allColours.map(c => c.roleID);
            const discordColours = this.discordGuild.roles
                .filterArray(role => colourRoleIds.includes(role.id));
            const userWithGuildContext = yield this.discordGuild.member(this.discordUser);
            yield userWithGuildContext.removeRoles(discordColours);
            return {
                status: ColourStatusReturns.SUCCESS,
                message: 'Colour deleted!',
                type: 'success',
            };
        });
    }
}
exports.default = UserColourInteractor;
