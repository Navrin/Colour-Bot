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
const colourRequest_1 = require("../models/colourRequest");
const user_1 = require("../models/user");
class RequestController {
    /**
     * Creates an instance of RequestController.
     * @param {Connection} connection
     * @memberof RequestController
     */
    constructor(connection, guild) {
        this.connection = connection;
        this.requestRepo = connection.getRepository(colourRequest_1.ColourRequest);
        this.guildRepo = connection.getRepository(guild_1.Guild);
        this.userRepo = connection.getRepository(user_1.User);
        this.guild = guild;
    }
    /**
     * Returns all the current requests a guild has.
     *
     * @returns
     * @memberof RequestController
     */
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            const requests = yield this.requestRepo
                .createQueryBuilder('requests')
                .innerJoinAndSelect('requests.guild', 'guilds')
                .where('guilds.id = :guild', { guild: this.guild.id })
                .innerJoinAndSelect('requests.user', 'users')
                .getMany();
            return requests;
        });
    }
    /**
     * Finds a request without scoping to any guilds.
     *
     * @param {number} id
     * @memberof RequestController
     */
    find(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.requestRepo.findOneById(id);
        });
    }
    /**
     * Get a request scoped to the discord guild.
     *
     * @param {number} id
     * @returns
     * @memberof RequestController
     */
    read(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const entities = yield this.guildRepo
                .createQueryBuilder('guild')
                .where('guild.id = :guild', { guild: this.guild })
                .innerJoinAndSelect('guild.requests', 'request')
                .andWhere('request.id = :id', { id })
                .getOne();
            if (entities) {
                return entities.requests[0];
            }
            return entities;
        });
    }
    /**
     * Creates a new request and returns it
     *
     * @param {{ colour: string }} { colour }
     * @memberof RequestController
     */
    create({ colour, user }) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = new colourRequest_1.ColourRequest();
            request.colour = colour;
            request.guild = this.guild;
            request.user = user;
            user.requests.push(request);
            this.userRepo.persist(user);
            return yield this.requestRepo.persist(request);
        });
    }
    /**
     * Updates the colour on a request object.
     *
     * @param {{ colour: string }} { colour }
     * @memberof RequestController
     */
    update(id, { colour }) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = yield this.requestRepo.findOneById(id);
            if (request === undefined) {
                throw new TypeError('Request object does not exist!');
            }
            request.colour = colour;
            return yield this.requestRepo.persist(request);
        });
    }
    /**
     * Deletes a request ID.
     *
     * @param {number} id
     * @returns
     * @memberof RequestController
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = yield this.requestRepo.findOneById(id);
            if (request === undefined) {
                throw new TypeError('Request object does not exist!');
            }
            try {
                yield this.requestRepo.remove(request);
                return true;
            }
            catch (e) {
                return false;
            }
        });
    }
}
exports.default = RequestController;
