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
// tslint:disable:import-name
const simple_discordjs_1 = require("simple-discordjs");
const Discord = require("discord.js");
const colourizer_1 = require("./colourizer");
const settings = require('../botConfig.json');
const utils_1 = require("./utils");
require("./database/init");
const confirmer_1 = require("./confirmer");
const channelLocker_1 = require("./channelLocker");
const actions_1 = require("./database/guild/actions");
const limiter = new simple_discordjs_1.RateLimiter(5, 10);
const client = new Discord.Client();
const colourizer = new colourizer_1.default();
const auth = new simple_discordjs_1.Auth(settings.superuser || process.env.COLOUR_BOT_SUPERUSER, {
    deleteMessageDelay: 1000,
    deleteMessages: true,
});
const locker = new channelLocker_1.default();
client.login(settings.token || process.env.COLOUR_BOT_TOKEN);
client.on('ready', () => {
    console.log('I\'m alive!');
});
process.on('unhandledRejection', (e) => {
    console.error('Uncaught promise error: \n' + e.stack);
});
const prefix = settings.prefix || process.env.COLOUR_BOT_PREFIX || 'c.';
client.on('guildCreate', (guild) => {
    actions_1.listenForGuilds(guild);
    const owner = guild.owner;
    owner.send(
    // tslint:disable-next-line:max-line-length
    `
Hey! Thanks for adding me onto your server. I'll be able to manage and handle the creation of new colours, provided I have the right permissions!

To get started, find a mod channel and begin the server initiation with 
\`${prefix}init\`

(use ${prefix}help to see all of the commands.)
`);
});
new simple_discordjs_1.default(prefix, client, {
    deleteCommandMessage: false,
    deleteMessageDelay: 2000,
    botType: 'normal',
    killErrorMessages: true,
})
    .use(auth.authenticate)
    .use(locker.lock)
    .use(limiter.protect)
    .defineCommand(utils_1.getInviteLinkDescriber())
    .defineCommand(auth.getCommand())
    .defineCommand(locker.getSetChannelLock())
    .defineCommand(colourizer.guardChannel(prefix))
    .defineCommand(colourizer.getInitiateCommand())
    .defineCommand(colourizer.getSetCommand())
    .defineCommand(colourizer.getDirtyColourCommand(prefix))
    .defineCommand(colourizer.getColourCommand())
    .defineCommand(colourizer.getDeleteColour())
    .defineCommand(colourizer.getGenerateColours())
    .defineCommand(colourizer.getQuickColourCommand())
    .defineCommand(colourizer.getListCommand())
    .defineCommand(colourizer.getCycleExistingCommand())
    .defineCommand(colourizer.getMessageCommand())
    .generateHelp()
    .listen((message) => __awaiter(this, void 0, void 0, function* () {
    if (locker.testGuild(message) && message.author.id !== client.user.id) {
        if (message.content.length <= 0) {
            confirmer_1.confirm(message, 'failure', 'Message body is empty!');
        }
    }
}));
