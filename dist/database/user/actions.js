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
const model_1 = require("./model");
const model_2 = require("../colour/model");
const model_3 = require("../guild/model");
const createUserIfNone = (discordUser, guild, connection, colour) => __awaiter(this, void 0, void 0, function* () {
    try {
        const userRepo = yield connection.getRepository(model_1.User);
        const colourRepo = yield connection.getRepository(model_2.Colour);
        const guildRepo = yield connection.getRepository(model_3.Guild);
        const user = new model_1.User();
        user.id = discordUser.id;
        user.colour = colour;
        user.guild = guild;
        yield guildRepo.persist(guild);
        yield colourRepo.persist(colour);
        yield userRepo.persist(user);
        return user;
    }
    catch (e) {
        console.log(e);
        return;
    }
});
exports.createUserIfNone = createUserIfNone;
const findUser = (user, guild, connection) => __awaiter(this, void 0, void 0, function* () {
    const guildRepo = yield connection.getRepository(model_3.Guild);
    const userRepo = yield connection.getRepository(model_1.User);
    const userEntity = userRepo
        .createQueryBuilder('user')
        .innerJoin('user.guild', 'guild', 'user.guild = guild.id')
        .where('user.id = :userid', { userid: user })
        .getOne();
    return userEntity;
});
exports.findUser = findUser;
