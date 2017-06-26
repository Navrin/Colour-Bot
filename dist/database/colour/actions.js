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
const typeorm_1 = require("typeorm");
const model_1 = require("./model");
const model_2 = require("../guild/model");
exports.createNewColour = (message, name, roleID) => __awaiter(this, void 0, void 0, function* () {
    const colourRepo = yield typeorm_1.getConnectionManager()
        .get()
        .getRepository(model_1.Colour);
    const guildRepo = yield typeorm_1.getConnectionManager()
        .get()
        .getRepository(model_2.Guild);
    const colour = new model_1.Colour();
    const guild = yield guildRepo.findOneById(parseInt(message.guild.id, 10));
    if (!guild) {
        message.channel.send(`Guild does not exist.`);
        return false;
    }
    colour.guild = guild;
    colour.name = name;
    colour.roleID = roleID;
    colour.users = [];
    // guild.colours.push(colour);
    yield guildRepo.persist(guild);
    yield colourRepo.persist(colour);
    return yield colour;
});
