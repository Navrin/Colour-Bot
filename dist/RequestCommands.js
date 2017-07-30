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
const simple_discordjs_1 = require("simple-discordjs");
const confirmer_1 = require("./confirmer");
const UserController_1 = require("./controllers/UserController");
const UserHelper_1 = require("./helpers/UserHelper");
const GuildHelper_1 = require("./helpers/GuildHelper");
const GuildController_1 = require("./controllers/GuildController");
const RequestController_1 = require("./controllers/RequestController");
const GuildRequestInteractor_1 = require("./interactions/GuildRequestInteractor");
const GuildColourInteractor_1 = require("./interactions/GuildColourInteractor");
const Discord = require("discord.js");
const common_tags_1 = require("common-tags");
const sleep = (delay) => new Promise((res, rej) => {
    setTimeout(() => res(), delay);
});
const _ntc = require('name-this-color');
const colourName = name => _ntc(name)[0];
const COLOUR_MATCH = /(?:#)?[0-9a-f]{6}/;
class RequestCommands {
    constructor(connection, colourizer) {
        this.getRequestColour = () => ({
            command: {
                action: this.requestNewColour,
                names: ['request', 'newcolour', 'requestcolour'],
                parameters: '{{colour}}',
            },
            description: {
                message: 'Request a new colour to be added',
                example: '{{{prefix}}}request #c0c0c0',
            },
        });
        this.getRemoveRequest = () => ({
            command: {
                action: this.cancelRequest,
                names: ['cancelrequest', 'cancel'],
            },
            description: {
                message: 'Cancels whatever request you have active',
                example: '{{{prefix}}}cancel',
            },
        });
        this.getCycleRequests = () => ({
            command: {
                action: this.cycleRequests,
                names: ['requests', 'allrequests'],
            },
            authentication: simple_discordjs_1.RoleTypes.ADMIN,
            description: {
                message: 'Parses all active colour requests',
                example: '{{{prefix}}}allrequests',
            },
        });
        /**
         * Creates a new request for the guild.
         *
         * @type {CommandFunction}
         * @memberof RequestCommands
         */
        this.requestNewColour = (message, opts, params) => __awaiter(this, void 0, void 0, function* () {
            if (!COLOUR_MATCH.test(params.named.colour)) {
                confirmer_1.confirm(message, 'failure', 'No colour was specified!');
                return;
            }
            const guildEntity = yield this.guildHelper.findOrCreateGuild(message.guild.id);
            const userEntity = yield this.userHelper.findOrCreateUser(message.author.id, guildEntity);
            if (userEntity.requests[0]) {
                confirmer_1.confirm(message, 'failure', 'You already have a pending colour request! `cancel` your current one or wait!');
                return;
            }
            const requestController = new RequestController_1.default(this.connection, guildEntity);
            const guildRequestInteractor = new GuildRequestInteractor_1.default(this.connection, message, guildEntity);
            const request = yield guildRequestInteractor.createNewRequest(message.author, params.named.colour);
            switch (request.status) {
                case GuildRequestInteractor_1.RequestColourStatus.FAILURE_UPDATE_LIST:
                case GuildRequestInteractor_1.RequestColourStatus.SUCCESS_UPDATE_LIST:
                    this.colourizer.updateOrListColours(message);
            }
            if (request.type === 'success'
                && guildEntity.settings
                && guildEntity.settings.autoAcceptRequests) {
                const name = colourName(params.named.colour).title.toLowerCase();
                this.parseRequest(message, request.data, name);
            }
            confirmer_1.confirm(message, request.type, request.message);
        });
        this.cancelRequest = (message) => __awaiter(this, void 0, void 0, function* () {
            const guildEntity = yield this.guildHelper.findOrCreateGuild(message.guild.id);
            const userEntity = yield this.userHelper.findOrCreateUser(message.author.id, guildEntity);
            const request = userEntity.requests[0];
            if (request === undefined) {
                confirmer_1.confirm(message, 'failure', 'You don\'t have a pending request.');
                return;
            }
            const requestController = new RequestController_1.default(this.connection, guildEntity);
            yield requestController.delete(request.id);
            confirmer_1.confirm(message, 'success');
        });
        this.cycleRequests = (message) => __awaiter(this, void 0, void 0, function* () {
            const replier = yield message.channel.send(common_tags_1.stripIndents `
            This command will cycle through all the current requests for the guild.
            It is recommended you do this in a moderation channel.
            Would you like to continue? \`y\` or \`n\`
        `);
            const firstReply = yield this.getNextReply(message, message.author);
            const firstReplyContents = firstReply.content.toLowerCase();
            if (firstReplyContents.startsWith('n') || !firstReplyContents.startsWith('y')) {
                confirmer_1.confirm(message, 'failure', 'Command was canceled by the user!');
                return;
            }
            firstReply.delete();
            const guildEntity = yield this.guildHelper.findOrCreateGuild(message.guild.id);
            const requestController = new RequestController_1.default(this.connection, guildEntity);
            const requests = yield requestController.index();
            for (const request of requests) {
                const requester = message.guild.members.get(request.user.id);
                if (requester === undefined) {
                    replier.edit('Requester left the server, skipping...');
                    requestController.delete(request.id);
                    yield sleep(1500);
                    continue;
                }
                const embed = new Discord.RichEmbed()
                    .setColor(request.colour)
                    .setTitle(`Request Colour: ${request.colour}`)
                    .addField(`Requester`, `User ${requester.displayName} requested this.`)
                    .addField(`Confirm?`, common_tags_1.oneLineTrim `
                    Would you like to confirm this request? 
                    (\`y\` or \`n\` or \`cancel\` or \`finish\`)`);
                yield replier.edit({ embed });
                const nextReply = yield this.getNextReply(message, message.author);
                const contents = nextReply.content.toLowerCase();
                if (contents.startsWith('n')) {
                    nextReply.delete();
                    continue;
                }
                if (contents.startsWith('cancel')) {
                    confirmer_1.confirm(message, 'failure', 'Function was canceled!');
                    replier.delete();
                    nextReply.delete();
                    return;
                }
                if (contents.startsWith('finish')) {
                    nextReply.delete();
                    break;
                }
                if (!contents.startsWith('y')) {
                    confirmer_1.confirm(message, 'failure', 'Bad input given!');
                    nextReply.delete();
                    return;
                }
                nextReply.delete();
                const nextEmbed = new Discord.RichEmbed()
                    .setColor(request.colour)
                    .addField('Name', 'Type in the color name for this role.')
                    .addField('Automatic', `To set as **${colourName(request.colour).title.toLowerCase()}**, type =auto`)
                    .addField('Cancel', 'To cancel, type =cancel');
                yield replier.edit({ embed: nextEmbed });
                const finalReply = yield this.getNextReply(message, message.author);
                const replyContents = finalReply.content.toLowerCase();
                if (replyContents.startsWith('=cancel')) {
                    finalReply.delete();
                    continue;
                }
                const roleName = (replyContents.startsWith('=auto'))
                    ? colourName(request.colour).title.toLowerCase()
                    : replyContents;
                yield this.parseRequest(message, request, roleName);
                finalReply.delete();
            }
            if (guildEntity.listmessage) {
                const chan = message.guild.channels.get(guildEntity.listmessage);
                if (chan) {
                    const generator = yield chan.send('Generating colours...!');
                    this.colourizer.updateOrListColours(generator, true);
                }
            }
            replier.edit({
                embed: {
                    description: 'All done!',
                },
            });
            replier.delete(3000);
            confirmer_1.confirm(message, 'success');
            return true;
        });
        this.connection = connection;
        this.userControler = new UserController_1.default(this.connection);
        this.userHelper = new UserHelper_1.default(this.userControler);
        this.guildHelper = new GuildHelper_1.default(this.connection);
        this.guildController = new GuildController_1.default(this.connection);
        this.colourizer = colourizer;
    }
    /**
     * Turns a request into a persisted colour.
     *
     * @param {Discord.Message} message
     * @param {ColourRequest} request
     * @param {string} name
     * @returns
     * @memberof RequestCommands
     */
    parseRequest(message, request, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const guildColourInteractor = new GuildColourInteractor_1.default(this.connection, message, request.guild);
            const requestController = new RequestController_1.default(this.connection, request.guild);
            const colour = yield message.guild.createRole({
                name,
                color: request.colour,
            });
            const colourEntity = yield guildColourInteractor.createOrUpdateColour(colour, name);
            switch (colourEntity.status) {
                case GuildColourInteractor_1.GuildColourStatus.FAILURE_UPDATE_LIST:
                case GuildColourInteractor_1.GuildColourStatus.SUCCESS_UPDATE_LIST:
                    this.colourizer.updateOrListColours(message);
            }
            yield requestController.delete(request.id);
            return colourEntity;
        });
    }
    /**
     * Gets a reply from the user.
     *
     * @private
     * @param {Discord.Message} message
     * @param {Discord.User} author
     * @returns
     * @memberof RequestCommands
     */
    getNextReply(message, author) {
        return __awaiter(this, void 0, void 0, function* () {
            const reply = yield message.channel.awaitMessages(msg => msg.author.id === author.id, {
                maxMatches: 1,
            });
            return reply.first();
        });
    }
}
exports.RequestCommands = RequestCommands;
