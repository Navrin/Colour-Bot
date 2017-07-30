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
require("../models/__init");
const user_1 = require("../models/user");
class UserController {
    constructor(connection) {
        this.connection = connection;
        this.userRepo = this.connection.getRepository(user_1.User);
    }
    /**
     * Returns all users without their given relations.
     *
     * @returns
     * @memberof UserController
     */
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            const users = this.userRepo.find();
            return users;
        });
    }
    /**
     * Find a user via it's id.
     * If a guild is given, only load its entities in relation to the guild.
     * Else, load all it's relations (intensive)
     * Very intensive, so only use it when you need the unknown colours.
     *
     * @param {string} id
     * @param {string} guild
     * @returns
     * @memberof UserController
     */
    find(id, guild) {
        return __awaiter(this, void 0, void 0, function* () {
            if (guild === undefined) {
                return this.userRepo.findOne({
                    id,
                    alias: 'user',
                    innerJoinAndSelect: {
                        // guilds: 'user.guilds',
                        requests: 'user.requests',
                    },
                });
            }
            const user = yield this.userRepo
                .createQueryBuilder('user')
                .where('user.id = :id', { id })
                .innerJoinAndSelect('user.requests', 'requests', 'requests.guild = :guild')
                .addParameters({ guild })
                .getOne();
            return user;
        });
    }
    /**
     * Get a given user object without it's relationships.
     *
     * @param {string} id
     * @returns
     * @memberof UserController
     */
    read(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepo.findOneById(id);
            return user;
        });
    }
    /**
     * Creates a new user with optional guild and colour arguments.
     *
     * @param {UserCreatePayload} payload
     * @returns
     * @memberof UserController
     */
    create(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = new user_1.User();
            user.id = payload.id,
                user.guilds = (payload.guild) ? [payload.guild] : [];
            user.requests = [];
            return yield this.userRepo.persist(user);
        });
    }
    /**
     * Updates a given entitiy based on the ID with the payload.
     *
     * @param {string} id
     * @param {UserUpdatePayload} payload
     * @memberof UserController
     */
    update(id, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepo.findOneById(id);
            if (user === undefined) {
                throw new TypeError('User does not exist!');
            }
            for (const [key, value] of Object.entries(payload)) {
                if (Array.isArray(value)) {
                    // merge the original guild value array with the payload array.
                    user[key] = [...user[key], ...value];
                }
                else {
                    user[key] = value;
                }
            }
            const updatedUser = yield this.userRepo.persist(user);
            return updatedUser;
        });
    }
    /**
     * Delete a given entitiy based on the ID.
     *
     * @param {string} id
     * @memberof UserController
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepo.findOneById(id);
            if (user === undefined) {
                throw new TypeError('User does not exist!');
            }
            try {
                yield this.userRepo.remove(user);
                return true;
            }
            catch (e) {
                return false;
            }
        });
    }
}
exports.default = UserController;
const mergeArrays = (arr, merger) => {
    if (arr == null) {
        return merger;
    }
    return Array.isArray(arr) ? [...merger, ...arr] : [...merger, arr];
};
