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

client.on('guildCreate', (guild) => {
    listenForGuilds(guild);
    const owner = guild.owner;
    owner.send(
// tslint:disable-next-line:max-line-length
`
Hey! Thanks for adding me onto your server. I'll be able to manage and handle the creation of new colours, provided I have the right permissions!

To get started, you'll need to run a few commands first.

1. Set your (mods|admins) with \`c.addrole admin @role\`

2. **Set a channel with \`c.setchannel #COLOUR_REQUEST_CHANNEL\`**

3. // TODO: Type c.message to create a help message for this channel.

4. Quickly create a set of standard rainbow colours with \`c.generate\`

5. Type \`c.colours\` to create a new image list of colours with a light and dark background. 
(do this in the colour channel)

6. Add existing colour roles to the bot with \`c.setcolour colour_name discord_role_name\`
or create new colours with \`c.quickcolour colour_name hex_code\`

(use c.help to see all of the commands.)
`);
});

const prefix = settings.prefix || process.env.COLOUR_BOT_PREFIX || 'c.';

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
    .generateHelp()
    .listen();

