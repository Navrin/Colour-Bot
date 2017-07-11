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
exports.createGuildIfNone = (message) => __awaiter(this, void 0, void 0, function* () {
    try {
        const guild = yield makeGuildFromId(message.guild.id);
        message.react('☑');
        return yield guild;
    }
    catch (e) {
        console.log(e);
        message.channel.send('Woah. Error creating this guild, detonating the existing? guild.');
        const guildRepo = yield typeorm_1.getConnectionManager()
            .get()
            .getRepository(model_1.Guild);
        const maybeGuild = yield guildRepo.findOneById(message.guild.id);
        if (maybeGuild) {
            yield guildRepo.remove(maybeGuild);
        }
        return makeGuildFromId(message.guild.id);
    }
});
const makeGuildFromId = (id) => __awaiter(this, void 0, void 0, function* () {
    const guildRepo = yield typeorm_1.getConnectionManager()
        .get()
        .getRepository(model_1.Guild);
    const guild = new model_1.Guild();
    guild.id = id;
    guild.colours = [];
    guild.users = [];
    yield guildRepo.persist(guild);
    return guild;
});
exports.listenForGuilds = (guild) => __awaiter(this, void 0, void 0, function* () {
    const maybeGuild = yield typeorm_1.getConnectionManager()
        .get()
        .getRepository(model_1.Guild)
        .findOneById(guild.id);
    if (maybeGuild === undefined) {
        makeGuildFromId(guild.id);
    }
});
