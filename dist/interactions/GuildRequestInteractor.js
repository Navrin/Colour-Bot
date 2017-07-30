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
const colourRequest_1 = require("../models/colourRequest");
const common_tags_1 = require("common-tags");
const guild_1 = require("../models/guild");
const RequestController_1 = require("../controllers/RequestController");
const ColourController_1 = require("../controllers/ColourController");
const UserController_1 = require("../controllers/UserController");
const UserHelper_1 = require("../helpers/UserHelper");
const _cd = require('color-difference');
const compareColours = (origin, target) => {
    return _cd.compare(origin, target);
};
var RequestColourStatus;
(function (RequestColourStatus) {
    RequestColourStatus[RequestColourStatus["SUCCESS"] = 0] = "SUCCESS";
    RequestColourStatus[RequestColourStatus["SUCCESS_UPDATE_LIST"] = 1] = "SUCCESS_UPDATE_LIST";
    RequestColourStatus[RequestColourStatus["FAILURE"] = 2] = "FAILURE";
    RequestColourStatus[RequestColourStatus["FAILURE_UPDATE_LIST"] = 3] = "FAILURE_UPDATE_LIST";
})(RequestColourStatus = exports.RequestColourStatus || (exports.RequestColourStatus = {}));
class GuildRequestInteractor {
    /**
     * Creates an instance of GuildRequestController.
     * @param {Connection} connection
     * @param {Discord.Message} context
     * @param {Guild} guild
     * @memberof GuildRequestController
     */
    constructor(connection, context, guild) {
        this.connection = connection;
        this.context = context;
        this.guild = guild;
        this.discordGuild = context.guild;
        this.guildRepo = this.connection.getRepository(guild_1.Guild);
        this.requestRepo = this.connection.getRepository(colourRequest_1.ColourRequest);
        this.colourController = new ColourController_1.default(connection, guild);
        this.requestController = new RequestController_1.default(connection, guild);
        this.userController = new UserController_1.default(connection);
        this.userHelper = new UserHelper_1.default(this.userController);
    }
    /**
     * Creates a new colour request for the guild.
     * If the guild already has a colour close to the request,
     * deny the request.
     *
     * @param {Discord.User} user
     * @param {string} colour
     * @memberof GuildRequestController
     */
    createNewRequest(user, colour) {
        return __awaiter(this, void 0, void 0, function* () {
            const colourEntities = yield this.colourController.index();
            const entityRoles = colourEntities.map(colour => colour.roleID);
            const colourRoles = this.discordGuild.roles
                .filter(role => entityRoles.includes(role.id));
            const existingColours = colourEntities
                .map(colour => ({
                name: colour.name,
                role: colourRoles.get(colour.roleID),
            }))
                .filter(entity => entity.role !== undefined
                && this.guild.settings
                && compareColours(colour, entity.role.hexColor) <= this.guild.settings.colourDelta);
            if (existingColours.length > 0) {
                const existing = existingColours[0];
                return {
                    status: RequestColourStatus.FAILURE,
                    message: common_tags_1.oneLineTrim `Colour ${colour} is too close to an 
                    existing colour (${existing.name}, 
                    ${(existing.role && existing.role.hexColor) || ''})`,
                    type: 'failure',
                };
            }
            const userEntity = yield this.userHelper.findOrCreateUser(user.id);
            const request = yield this.requestController.create({ colour, user: userEntity });
            return {
                status: RequestColourStatus.SUCCESS,
                message: 'Success!',
                type: 'success',
                data: request,
            };
        });
    }
    cancelRequest(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const userEntity = this.userHelper.findOrCreateUser(user.id, this.guild);
        });
    }
}
exports.default = GuildRequestInteractor;
