"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const simple_discordjs_1 = require("simple-discordjs");
const Discord = require("discord.js");
const colourizer_1 = require("./colourizer");
const settings = require('../botConfig.json');
const utils_1 = require("./utils");
require("./database/init");
const channelLocker_1 = require("./channelLocker");
const limiter = new simple_discordjs_1.RateLimiter(1, 100);
const client = new Discord.Client();
const colourizer = new colourizer_1.default();
const auth = new simple_discordjs_1.Auth(settings.superuser || process.env.COLOUR_BOT_SUPERUSER);
const locker = new channelLocker_1.default();
client.login(settings.token || process.env.COLOUR_BOT_TOKEN);
client.on('ready', () => {
    console.log('I\'m alive!');
});
process.on('unhandledRejection', (e) => {
    console.error(e);
});
new simple_discordjs_1.default('c.', client)
    .use(auth.authenticate)
    .use(locker.lock)
    .defineCommand(utils_1.getInviteLinkDescriber())
    .defineCommand(locker.getSetChannelLock())
    .defineCommand(auth.getCommand())
    .defineCommand(colourizer.getDirtyColourCommand())
    .defineCommand(colourizer.getSetCommand())
    .defineCommand(colourizer.getColourCommand())
    .defineCommand(colourizer.getListCommand())
    .defineCommand(colourizer.getGenerateColours())
    .defineCommand(colourizer.getQuickColourCommand())
    .generateHelp()
    .listen();
