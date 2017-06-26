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
const auth = new Auth(settings.superuser || process.env.COLOUR_BOT_SUPERUSER);
const locker = new ChannelLocker();

client.login(settings.token || process.env.COLOUR_BOT_TOKEN)
client.on('ready', () => {
    console.log('I\'m alive!');
});

new Commands('ctest.', client)
    .use(auth.authenticate)
    .use(locker.lock)
    .defineCommand(getInviteLinkDescriber())
    .defineCommand(locker.getSetChannelLock())
    .defineCommand(auth.getCommand())
    .defineCommand(colourizer.getDirtyColourCommand())
    .defineCommand(colourizer.getSetCommand())
    .defineCommand(colourizer.getColourCommand())
    .defineCommand(colourizer.getListCommand())
    .defineCommand(colourizer.getGenerateColours())
    .generateHelp()
    .listen();

