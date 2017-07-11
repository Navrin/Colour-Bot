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
        user.colours = [colour];
        user.guilds = [guild];
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
    const colourRepo = yield connection.getRepository(model_2.Colour);
    // const userEntity = userRepo
    //     .createQueryBuilder('user')
    //     .innerJoin('user.guild', 'guild', 'user.guild = guild.id')
    //     .innerJoin('user.colour', 'colour', 'user.colour = colour.id')
    //     .where('user.id = :userid', { userid: user })
    //     .getOne();
    const userRecordA = yield userRepo.findOne({
        alias: 'user',
        id: user,
        innerJoinAndSelect: {
            guilds: 'user.guilds',
            colours: 'user.colours',
        },
    });
    const userRecord = yield userRepo
        .createQueryBuilder('user')
        .where('user.id = :user', { user })
        .innerJoinAndSelect('user.guilds', 'guilds')
        .andWhere('guilds.id = :guild', { guild: guild.id })
        .innerJoinAndSelect('user.colours', 'colours', 'colours.guild = guilds.id')
        .getOne();
    if (userRecord === undefined) {
        return;
    }
    if (!userRecord.guilds.includes(guild)) {
        userRecord.guilds.push(guild);
        userRepo.persist(userRecord);
    }
    return userRecord;
});
exports.findUser = findUser;
