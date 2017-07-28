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
class UserHelper {
    /**
     * Creates an instance of UserHelper.
     * @param {UserController} controller
     * @memberof UserHelper
     */
    constructor(controller) {
        this.controller = controller;
    }
    /**
     * Finds an existing user from and ID.
     * If it does not exist, create a new user.
     *
     * @param {string} id
     * @memberof UserHelper
     */
    findOrCreateUser(id, guild) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingUser = yield this.controller.find(id, (guild) ? guild.id : undefined);
            if (existingUser) {
                return existingUser;
            }
            const newUser = yield this.controller.create({
                id,
                guild,
            });
            return newUser;
        });
    }
}
exports.default = UserHelper;
