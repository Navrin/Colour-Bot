import { getConnectionManager, getConnection } from 'typeorm';
// tslint:disable:import-name
import connection from './models/__init';
import Commands, { RateLimiter, Auth } from 'simple-discordjs';
import * as Discord from 'discord.js';
import Colourizer from './Colourizer';
const settings: {
    token?: string,
    superuser?: string,
    prefix?: string,
} = require('../botConfig.json');
import { getInviteLinkDescriber } from './utils/commands';
import { confirm } from './confirmer';
import ChannelLocker from './channelLocker';
import GuildHelper from './helpers/GuildHelper';
import { stripIndents } from 'common-tags';

import * as Bluebird from 'bluebird';
import Settings, { Types } from './Settings';

Bluebird.config({
    longStackTraces: true,
});

global.Promise = Bluebird;

const limiter = new RateLimiter(5, 10);
const client = new Discord.Client();
const auth = new Auth(settings.superuser || process.env.COLOUR_BOT_SUPERUSER, {
    deleteMessageDelay: 1000,
    deleteMessages: true,
});

client.login(settings.token || process.env.COLOUR_BOT_TOKEN);

process.on('unhandledRejection', (e: Error) => {
    console.error('Uncaught promise error: \n' + e.stack);
});

process.on('error', (e: Error) => {
    console.error('Uncaught error at: ', e.stack);
});

const prefix = settings.prefix || process.env.COLOUR_BOT_PREFIX || 'c.';

client.on('ready', () => {
    console.log('I\'m alive!');
    connection
        .then(async (connection) => {
            if (!connection) {
                throw new Error('DATABASE CONNECTION FAILURE.');
            }

            const guildHelper = new GuildHelper(connection);

            client.on('guildCreate', (guild) => {
                const guildEntity = guildHelper.findOrCreateGuild(guild.id);
                const { owner } = guild;
                owner.send(
                    // tslint:disable-next-line:max-line-length
                    stripIndents`
                    Hey! Thanks for adding me onto your server. I'll be able to manage and handle the creation of new colours, provided I have the right permissions!
        
                    To get started, find a mod channel and begin the server initiation with 
                    \`${prefix}init\`
                    
                    (use \`${prefix}help\` to see all of the commands.)
                `);
            });
    
            for (const [id, guild] of client.guilds) {
                await guildHelper.findOrCreateGuild(id);
            }


            const colourizer = new Colourizer();
            const locker = new ChannelLocker(connection);

            const settings = new Settings(connection, {
                colourDelta: {
                    type: Types.num,
                    aliases: ['delta', 'limit', 'near'],
                    description: 'Defines how "close" two colours can\'t be.',
                },
                autoAcceptRequests: {
                    type: Types.bool,
                    aliases: ['auto', 'automatic', 'autoaccept'],
                    description: 'Defines if a request will automatically be accepted',
                },
            });

            new Commands(prefix, client, {
                deleteCommandMessage: false,
                deleteMessageDelay: 2000,
                botType: 'normal',
                killErrorMessages: true,
            })
                .use(auth.authenticate)
                .use(locker.lock)
                .use(limiter.protect)
                .defineCommand(getInviteLinkDescriber())
                .defineCommand(auth.getCommand())
                .defineCommand(locker.getSetChannelLock())
                .defineCommand(colourizer.guardChannel(prefix))
                // uses m8 regex to allow for the colours to be called without any prefix
                // only in some channels though.
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
                .defineCommand(colourizer.requests.getCycleRequests())
                .defineCommand(colourizer.requests.getRequestColour())
                .defineCommand(colourizer.requests.getRemoveRequest())
                .defineCommand(settings.getSetCommand())
                .defineCommand(settings.getListSettingsCommand())
                .defineCommand(colourizer.getNewsCommand())
                .generateHelp()
                .listen(async (message) => {
                    if (message.channel.type !== 'dm'
                        && message.author.id !== client.user.id
                        && await locker.testGuild(message)) {

                        if (message.content.length <= 0) {
                            confirm(message, 'failure', 'Message body is empty!');
                        }

                    }
                });
        });
});
