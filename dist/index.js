"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const simple_discordjs_1 = require("simple-discordjs");
const Discord = require("discord.js");
const colourizer_1 = require("./colourizer");
const settings = require('../botConfig.json');
require("./database/init");
const limiter = new simple_discordjs_1.RateLimiter(1, 100);
const client = new Discord.Client();
const colourizer = new colourizer_1.default();
const auth = new simple_discordjs_1.Auth('216405997537853441');
client.login(settings.token || process.env.api_key);
client.on('ready', () => {
    console.log('I\'m alive!');
});
new simple_discordjs_1.default('c.', client)
    .use(auth.authenticate)
    .defineCommand(auth.getCommand())
    .defineCommand(colourizer.getSetCommand())
    .defineCommand(colourizer.getColourCommand())
    .defineCommand(colourizer.getListCommand())
    .defineCommand(colourizer.getGenerateColours())
    .generateHelp()
    .listen();
