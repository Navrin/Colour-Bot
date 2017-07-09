"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:import-name
const simple_discordjs_1 = require("simple-discordjs");
const Discord = require("discord.js");
const colourizer_1 = require("./colourizer");
const settings = require('../botConfig.json');
const utils_1 = require("./utils");
require("./database/init");
const channelLocker_1 = require("./channelLocker");
const actions_1 = require("./database/guild/actions");
const limiter = new simple_discordjs_1.RateLimiter(1, 100);
const client = new Discord.Client();
const colourizer = new colourizer_1.default();
const auth = new simple_discordjs_1.Auth(settings.superuser || process.env.COLOUR_BOT_SUPERUSER, {
    deleteMessageDelay: 100,
    deleteMessages: true,
});
const locker = new channelLocker_1.default();
client.login(settings.token || process.env.COLOUR_BOT_TOKEN);
client.on('ready', () => {
    console.log('I\'m alive!');
});
process.on('unhandledRejection', (e) => {
    console.error(e, e.stack);
});
client.on('guildCreate', (guild) => {
    actions_1.listenForGuilds(guild);
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
new simple_discordjs_1.default(prefix, client, {
    deleteCommandMessage: false,
    deleteMessageDelay: 2000,
    botType: 'normal',
    killErrorMessages: true,
})
    .use(auth.authenticate)
    .use(locker.lock)
    .defineCommand(colourizer.guardChannel(prefix))
    .defineCommand(utils_1.getInviteLinkDescriber())
    .defineCommand(locker.getSetChannelLock())
    .defineCommand(auth.getCommand())
    .defineCommand(colourizer.getDirtyColourCommand(prefix))
    .defineCommand(colourizer.getSetCommand())
    .defineCommand(colourizer.getColourCommand())
    .defineCommand(colourizer.getListCommand())
    .defineCommand(colourizer.getGenerateColours())
    .defineCommand(colourizer.getQuickColourCommand())
    .defineCommand(colourizer.getDeleteColour())
    .generateHelp()
    .listen();
