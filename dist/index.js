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
const __init_1 = require("./models/__init");
const simple_discordjs_1 = require("simple-discordjs");
const Discord = require("discord.js");
const colourizer_1 = require("./colourizer");
const settings = require('../botConfig.json');
const utils_1 = require("./utils");
const confirmer_1 = require("./confirmer");
const channelLocker_1 = require("./channelLocker");
const GuildHelper_1 = require("./helpers/GuildHelper");
const common_tags_1 = require("common-tags");
const Bluebird = require("bluebird");
Bluebird.config({
    longStackTraces: true,
});
global.Promise = Bluebird;
const limiter = new simple_discordjs_1.RateLimiter(5, 10);
const client = new Discord.Client();
const auth = new simple_discordjs_1.Auth(settings.superuser || process.env.COLOUR_BOT_SUPERUSER, {
    deleteMessageDelay: 1000,
    deleteMessages: true,
});
client.login(settings.token || process.env.COLOUR_BOT_TOKEN);
process.on('unhandledRejection', (e) => {
    console.error('Uncaught promise error: \n' + e.stack);
});
process.on('error', (e) => {
    console.error('Uncaught error at: ', e.stack);
});
const prefix = settings.prefix || process.env.COLOUR_BOT_PREFIX || 'c.';
client.on('ready', () => {
    console.log('I\'m alive!');
    __init_1.default
        .then((connection) => __awaiter(this, void 0, void 0, function* () {
        if (!connection) {
            throw new Error('DATABASE CONNECTION FAILURE.');
        }
        const guildHelper = new GuildHelper_1.default(connection);
        client.on('guildCreate', (guild) => {
            const guildEntity = guildHelper.findOrCreateGuild(guild.id);
            const { owner } = guild;
            owner.send(
            // tslint:disable-next-line:max-line-length
            common_tags_1.stripIndents `
                    Hey! Thanks for adding me onto your server. I'll be able to manage and handle the creation of new colours, provided I have the right permissions!
        
                    To get started, find a mod channel and begin the server initiation with 
                    \`${prefix}init\`
                    
                    (use \`${prefix}help\` to see all of the commands.)
                `);
        });
        for (const [id, guild] of client.guilds) {
            yield guildHelper.findOrCreateGuild(id);
        }
        const colourizer = new colourizer_1.default();
        const locker = new channelLocker_1.default(connection);
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
            if (message.channel.type !== 'dm'
                && message.author.id !== client.user.id
                && (yield locker.testGuild(message))) {
                if (message.content.length <= 0) {
                    confirmer_1.confirm(message, 'failure', 'Message body is empty!');
                }
            }
        }));
    }));
});
