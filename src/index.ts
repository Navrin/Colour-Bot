// tslint:disable:import-name
import Commands, { RateLimiter, Auth } from 'simple-discordjs';
import * as Discord from 'discord.js';
import Colourizer from './colourizer';
const settings: {
    token?: string,
    superuser?: string,
} = require('../botConfig.json');
import { getInviteLinkDescriber } from './utils';
import './database/init';
import ChannelLocker from './channelLocker';

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

new Commands('c.', client)
    .use(auth.authenticate)
    .use(locker.lock)
    .defineCommand(getInviteLinkDescriber())
    .defineCommand(locker.getSetChannelLock())
    .defineCommand(auth.getCommand())
    .defineCommand(colourizer.getDirtyColourCommand('c.')) 
    // uses m8 regex to allow for the colours to be called without any prefix
    // only in some channels though.
    .defineCommand(colourizer.getSetCommand())
    .defineCommand(colourizer.getColourCommand())
    .defineCommand(colourizer.getListCommand())
    .defineCommand(colourizer.getGenerateColours())
    .defineCommand(colourizer.getQuickColourCommand())
    .defineCommand(colourizer.getDeleteColour())
    .generateHelp()
    .listen();

