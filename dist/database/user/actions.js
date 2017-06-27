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
const dispatch_1 = require("../../dispatch");
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
const setColourToUser = (newColour, connection, user, guild, message) => __awaiter(this, void 0, void 0, function* () {
    try {
        const userRepo = yield connection.getRepository(model_1.User);
        const colourRepo = yield connection.getRepository(model_2.Colour);
        const guildRepo = yield connection.getRepository(model_3.Guild);
        const colourList = yield colourRepo.find();
        if (user.colour != undefined) {
            const oldColour = message.guild.roles.get(user.colour.roleID);
            if (oldColour == undefined) {
                dispatch_1.dispatch(message, `Error setting colour!`);
                return false;
            }
            yield message.guild.member(message.author).removeRole(oldColour);
        }
        const userMember = message.guild.member(message.author.id);
        const possibleColours = colourList
            .map((colour) => userMember.roles.find('name', colour.name))
            .filter(id => id);
        yield userMember.removeRoles(possibleColours);
        const updatedUser = yield userRepo.persist(user);
        user.colour = newColour;
        yield colourRepo.persist(newColour);
        yield userRepo.persist(user);
        yield guildRepo.persist(guild);
        const nextColour = message.guild.roles.get(newColour.roleID.toString());
        if (nextColour == undefined) {
            dispatch_1.dispatch(message, `Error getting colour!`);
            return false;
        }
        try {
            message.guild.member(message.author).addRole(nextColour);
            dispatch_1.dispatch(message, `Your colour has been set!`);
        }
        catch (e) {
            dispatch_1.dispatch(message, `Error setting colour: ${e}`);
        }
        return true;
    }
    catch (e) {
        dispatch_1.dispatch(message, `error: ${e}`);
        return false;
    }
});
exports.setColourToUser = setColourToUser;
