// tslint:disable:import-name
import Commands, { RateLimiter, Auth } from 'simple-discordjs';
import * as Discord from 'discord.js';
import Colourizer from './colourizer';
const settings: {
    token?: string,
    superuser?: string,
    prefix: string,
} = require('../botConfig.json');
import { getInviteLinkDescriber } from './utils';
import './database/init';
import ChannelLocker from './channelLocker';
import { listenForGuilds } from './database/guild/actions';
const limiter = new RateLimiter(1, 100);
const client = new Discord.Client();
const colourizer = new Colourizer();
const auth = new Auth(settings.superuser || process.env.COLOUR_BOT_SUPERUSER, {
    deleteMessageDelay: 100,
    deleteMessages: true,
});
const locker = new ChannelLocker();

client.login(settings.token || process.env.COLOUR_BOT_TOKEN);
client.on('ready', () => {
    console.log('I\'m alive!');
});

process.on('unhandledRejection', (e: any) => {
    console.error(e, e.stack);
});

const prefix = settings.prefix || process.env.COLOUR_BOT_PREFIX || 'c.';

client.on('guildCreate', (guild) => {
    listenForGuilds(guild);
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


new Commands(prefix, client, {
    deleteCommandMessage: false,
    deleteMessageDelay: 2000,
    botType: 'normal',
    killErrorMessages: true,
})
    .use(auth.authenticate)
    .use(locker.lock)
    .defineCommand(colourizer.guardChannel(prefix))
    .defineCommand(getInviteLinkDescriber())
    .defineCommand(locker.getSetChannelLock())
    .defineCommand(auth.getCommand())
    .defineCommand(colourizer.getDirtyColourCommand(prefix))
    // uses m8 regex to allow for the colours to be called without any prefix
    // only in some channels though.
    .defineCommand(colourizer.getSetCommand())
    .defineCommand(colourizer.getColourCommand())
    .defineCommand(colourizer.getListCommand())
    .defineCommand(colourizer.getGenerateColours())
    .defineCommand(colourizer.getQuickColourCommand())
    .defineCommand(colourizer.getDeleteColour())
    .defineCommand(colourizer.getMessageCommand())
    .defineCommand(colourizer.getInitiateCommand())
    .generateHelp()
    .listen();

