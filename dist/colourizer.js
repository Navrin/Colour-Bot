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
const typeorm_1 = require("typeorm");
const simple_discordjs_1 = require("simple-discordjs");
const Discord = require("discord.js");
const common_tags_1 = require("common-tags");
const confirmer_1 = require("./confirmer");
const UserController_1 = require("./controllers/UserController");
const GuildController_1 = require("./controllers/GuildController");
const GuildHelper_1 = require("./helpers/GuildHelper");
const ColourController_1 = require("./controllers/ColourController");
const UserHelper_1 = require("./helpers/UserHelper");
const UserColourInteractor_1 = require("./interactions/UserColourInteractor");
const GuildColourInteractor_1 = require("./interactions/GuildColourInteractor");
const escapeStringRegexp = require("escape-string-regexp");
const listTemplate_1 = require("./listTemplate");
const webshot = require('webshot');
const createShot = (html, file, settings) => {
    return new Promise((res, rej) => {
        webshot(html, file, settings, (err) => {
            if (err) {
                rej(err);
            }
            res();
        });
    });
};
const sleep = (delay) => new Promise((res, rej) => {
    setTimeout(() => res(), delay);
});
const standardColours = {
    red: 0xFF0000,
    orange: 0xFF7F00,
    yellow: 0xFFFF00,
    green: 0x00FF00,
    blue: 0x0000FF,
    indigo: 0x4B0082,
    violet: 0x9400D3,
    white: 0xFFFFFF,
};
class Colourizer {
    constructor() {
        this.connection = typeorm_1.getConnectionManager().get();
        this.userController = new UserController_1.default(this.connection);
        this.userHelper = new UserHelper_1.default(this.userController);
        this.guildController = new GuildController_1.default(this.connection);
        this.guildHelper = new GuildHelper_1.default(this.connection);
        /************
         * COMMANDS *
         ************/
        this.getSetCommand = () => {
            return {
                authentication: simple_discordjs_1.RoleTypes.ADMIN,
                command: {
                    action: this.setColour,
                    names: ['setcolor', 'setcolour'],
                    parameters: '{{colour}} {{role}}',
                },
                description: {
                    message: common_tags_1.stripIndents `Sets a role colour to be registered.
                If no roles are mentions, perform a search for a role by name,
                and if more than one role is found, specify role name further.`,
                    example: common_tags_1.stripIndents `{{{prefix}}}setcolour green @role
                 {{{prefix}}}setcolour green role_name_here`,
                },
            };
        };
        this.getColourCommand = () => {
            return {
                command: {
                    action: this.getColour,
                    names: ['colour', 'addcolour', 'getcolour', 'color', 'addcolor', 'getcolor', ''],
                    parameters: '{{colour}}',
                },
                custom: {
                    locked: true,
                },
                description: {
                    message: 'Set a colour role to yourself',
                    example: '{{{prefix}}}getcolour green',
                },
            };
        };
        /**
         * A quick hack to allow for pre-fix less colour commands.
         * instead of c.getcolour green
         * users can type
         * green
         * into a set channel
         * @memberof Colourizer
         */
        this.getDirtyColourCommand = (prefix) => {
            return {
                command: {
                    action: (message, options, params, client, self) => __awaiter(this, void 0, void 0, function* () {
                        const res = new RegExp(`(.\s?)+`).exec(message.content);
                        if (res && !message.content.toLowerCase().startsWith(prefix)) {
                            yield this
                                .getColour(message, options, Object.assign({}, params, { named: {
                                    colour: res[0],
                                } }), client, self);
                        }
                        return false;
                    }),
                    names: ['colourdirty'],
                    noPrefix: true,
                    pattern: /(.\s?)+/,
                },
                custom: {
                    locked: true,
                },
            };
        };
        this.guardChannel = prefix => ({
            command: {
                action: (message, op, pr, cl, self) => __awaiter(this, void 0, void 0, function* () {
                    const regex = new RegExp(`${escapeStringRegexp(prefix)}([\\S]+)(\\s.+)?`);
                    const match = regex.exec(message.content);
                    if (match && match[1]) {
                        if (self.checkCommandExists(match[1])) {
                            return true;
                        }
                        confirmer_1.confirm(message, 'failure', 'Command does not exist!', { delay: 1500, delete: true });
                    }
                    return true;
                }),
                names: ['clean'],
                noPrefix: true,
                pattern: new RegExp(`${escapeStringRegexp(prefix)}.+`),
            },
            custom: {
                locked: true,
            },
        });
        this.getQuickColourCommand = () => {
            return {
                command: {
                    action: this.quickCreateColour,
                    names: ['quickcolour', 'makecolour', 'quickcolor', 'makecolor'],
                    parameters: '{{colourName}} {{colourCode}}',
                },
                authentication: simple_discordjs_1.RoleTypes.ADMIN,
                description: {
                    message: 'Generate a new colour quickly with a hex code',
                    example: '{{{prefix}}}quickcolour red FF0000',
                },
            };
        };
        this.getListCommand = () => {
            return {
                command: {
                    action: this.listColours,
                    names: ['allcolours', 'colours', 'allcolors', 'colors'],
                },
                description: {
                    message: common_tags_1.oneLineTrim `Creates a singleton message that keeps a list of all colours, 
                                     automatically updated`,
                    example: '{{{prefix}}}colours',
                },
                authentication: simple_discordjs_1.RoleTypes.ADMIN,
                custom: {
                    locked: true,
                },
            };
        };
        this.getGenerateColours = () => {
            return {
                command: {
                    action: this.generateStandardColours,
                    names: ['generate', 'generate_colours'],
                },
                authentication: simple_discordjs_1.RoleTypes.ADMIN,
                description: {
                    message: 'Generates a set of starter colours. (ADMIN ONLY)',
                    example: '{{{prefix}}}generate',
                },
            };
        };
        this.getDeleteColour = () => {
            return {
                command: {
                    action: this.deleteColourEntity,
                    names: ['delete', 'remove', 'purge'],
                    parameters: '{{colourName}}',
                },
                authentication: simple_discordjs_1.RoleTypes.ADMIN,
                description: {
                    message: 'Delete a role from the schema. (ADMIN ONLY)',
                    example: '{{{prefix}}}delete purple',
                },
            };
        };
        this.getMessageCommand = () => ({
            command: {
                action: this.createChannelMessage,
                names: ['message', 'pin', 'msg'],
            },
            authentication: simple_discordjs_1.RoleTypes.ADMIN,
            description: {
                message: 'Create a message for the colour channel (ADMIN ONLY)',
                example: '{{{prefix}}}msg',
            },
        });
        this.getInitiateCommand = () => ({
            command: {
                action: this.initiateNewServer,
                names: ['init', 'initiate', 'newserver'],
            },
            authentication: simple_discordjs_1.RoleTypes.OWNER,
            description: {
                message: 'Initiate a new server, do this in a private channel! (OWNER ONLY)',
                example: '{{{prefix}}}init',
            },
        });
        this.getCycleExistingCommand = () => ({
            command: {
                action: this.cycleExistingRoles,
                names: ['cycle_existing', 'cycle'],
            },
            authentication: simple_discordjs_1.RoleTypes.ADMIN,
            description: {
                message: 'Cycles the existing server roles as an interactive prompt.',
                example: '{{{prefix}}}cycle',
            },
        });
        /*********************
         * COMMAND FUNCTIONS *
         *********************/
        /**
         * Creates a help message in the colour channel.
         * // TODO: Allow for custom messages possibly?
         * // TODO: Track help messages like the list, to delete automatically when updated
         *
         * @private
         * @type {CommandFunction}
         * @memberof Colourizer
         */
        this.createChannelMessage = (message) => __awaiter(this, void 0, void 0, function* () {
            const guildEntity = yield this.guildHelper.findOrCreateGuild(message.guild.id);
            if (guildEntity && guildEntity.channel) {
                const channel = message
                    .guild
                    .channels
                    .find('id', guildEntity.channel);
                if (channel instanceof Discord.TextChannel) {
                    if (guildEntity.helpmessage) {
                        channel.fetchMessage(guildEntity.helpmessage)
                            .then((message) => {
                            if (message) {
                                message.delete();
                            }
                        })
                            .catch((err) => {
                            this.guildController.update(guildEntity.id, {
                                helpmessage: undefined,
                            });
                        });
                    }
                    const helpMessage = yield channel.send(common_tags_1.stripIndents `
                        Request a colour by typing out one of the following colours below. 

                        __**Only type just the colour, no messages before or after it.**__

                        __Don't try to talk in this channel__
                        messages are deleted automatically.`);
                    yield this.guildController.update(guildEntity.id, {
                        helpmessage: helpMessage.id,
                    });
                    confirmer_1.confirm(message, 'success');
                    return true;
                }
                confirmer_1.confirm(message, 'failure', 'Channel not found!');
                return false;
            }
            confirmer_1.confirm(message, 'failure', 'Set a colour channel first!');
            return false;
        });
        /**
         * Create a list of colours currently in the guild schema
         *
         * @private
         * @type {CommandFunction}
         * @memberof Colourizer
         */
        this.listColours = (message) => __awaiter(this, void 0, void 0, function* () {
            try {
                this.updateOrListColours(message, true);
                return true;
            }
            catch (e) {
                return false;
            }
        });
        /**
         * Finds a colour from a command schema such as
         * {{ colour }}
         * and adds it to the user.
         *
         * @private
         * @type {CommandFunction}
         * @memberof Colourizer
         */
        this.getColour = (message, options, parameters, client, self, silent = false) => __awaiter(this, void 0, void 0, function* () {
            const { author, guild } = message;
            const guildEntity = yield this.guildHelper.findOrCreateGuild(guild.id);
            const colourController = yield new ColourController_1.default(this.connection, guildEntity);
            const colour = yield colourController.find({
                name: parameters.named.colour,
            });
            if (colour === undefined) {
                confirmer_1.confirm(message, 'failure', 'Colour was not found, check spelling!');
                return false;
            }
            // const userEntity = await this.userHelper.findOrCreateUser(author.id, guildEntity);
            // const userEntityWithRelations =
            //     await this.userController.find(userEntity.id, guildEntity.id);
            const fullGuild = yield this.guildController.read(guild.id, true);
            if (fullGuild === undefined) {
                throw new Error('Loading the same guild returned undefined, database corruption?');
            }
            const colourInteractor = new UserColourInteractor_1.default(this.connection, message, fullGuild);
            const response = yield colourInteractor.addColour(colour);
            if (response.status === UserColourInteractor_1.ColourStatusReturns.FAILURE_UPDATE_LIST) {
                this.updateOrListColours(message);
            }
            confirmer_1.confirm(message, response.type, response.message);
        });
        /**
         * Sets a colour to the guild schema, only to be used by admins | mods
         * c.setcolour {{name}} {{green}}
         * will add the colour to the schema to be synced into the guild schema.
         *
         * **Colours will automatically be synced on a change, so old roles will
         * be sycned properly, making it easier to migrate**
         *
         * @private
         * @type {CommandFunction}
         * @memberof Colourizer
         */
        this.setColour = (message, options, parameters) => __awaiter(this, void 0, void 0, function* () {
            const { guild } = message;
            const guildEntity = yield this.guildHelper.findOrCreateGuild(guild.id);
            const guildInteractor = yield new GuildColourInteractor_1.default(this.connection, message, guildEntity);
            const roles = yield this.findRole(message, parameters.named.role);
            if (roles === undefined) {
                confirmer_1.confirm(message, 'failure', 'No roles found.');
                return;
            }
            else if (roles instanceof Discord.Collection && roles.size > 1) {
                const warning = common_tags_1.stripIndents `
                Multiple roles found.
                ${roles
                    .map(role => `Name -> ${role.name.replace('@', '')}`)
                    .join('\n')}
            `;
                confirmer_1.confirm(message, 'failure', warning, { delete: true, delay: 10000 });
                return;
            }
            const singularRole = (roles instanceof Discord.Collection) ? roles.first() : roles;
            const result = yield guildInteractor.createOrUpdateColour(singularRole, parameters.named.colour);
            switch (result.status) {
                case GuildColourInteractor_1.GuildColourStatus.FAILURE_UPDATE_LIST:
                case GuildColourInteractor_1.GuildColourStatus.SUCCESS_UPDATE_LIST:
                    this.updateOrListColours(message);
                    break;
            }
            confirmer_1.confirm(message, result.type, result.message);
        });
        /**
         * Creates a standard set of colours for demonstration and quick use.
         * Current just generates the standard 7 rainbow colours.
         *
         * @private
         * @type {CommandFunction}
         * @memberof Colourizer
         */
        this.generateStandardColours = (message) => __awaiter(this, void 0, void 0, function* () {
            const { guild } = message;
            const guildEntity = yield this.guildHelper.findOrCreateGuild(guild.id);
            const guildInteractor = yield new GuildColourInteractor_1.default(this.connection, message, guildEntity);
            for (const [colourName, colourCode] of Object.entries(standardColours)) {
                const oldRole = yield guild.roles.find('name', `colour-${colourName}`);
                const role = (oldRole)
                    ? oldRole
                    : yield guild.createRole({
                        name: `colour-${colourName}`,
                        color: colourCode,
                    });
                if (!role) {
                    continue;
                }
                const { type, data } = yield guildInteractor.createOrUpdateColour(role, colourName);
                if (type === 'failure') {
                    continue;
                }
            }
            this.updateOrListColours(message);
            return true;
        });
        /**
         * Quick utility method for mods to create a new colour role quickly.
         * c.quickcolour {{name}} {{colour_code}}
         * // TODO allow colour code to accept a #
         *
         * @private
         * @type {CommandFunction}
         * @memberof Colourizer
         */
        this.quickCreateColour = (message, options, params) => __awaiter(this, void 0, void 0, function* () {
            const { colourName, colourCode } = params.named;
            const colour = /(?:#)?[0-9a-f]{6}/gmi.exec(colourCode);
            const guildEntity = yield this.guildHelper.findOrCreateGuild(message.guild.id);
            const guildColourInteractor = yield new GuildColourInteractor_1.default(this.connection, message, guildEntity);
            if (!colour) {
                yield confirmer_1.confirm(message, 'failure', 'No colour was specified');
                return false;
            }
            const colourMatch = colour[0];
            const colourRole = yield message.guild.createRole({
                name: colourName,
                color: parseInt(colourMatch.replace('#', ''), 16),
            });
            const result = yield guildColourInteractor.createOrUpdateColour(colourRole, colourName);
            switch (result.status) {
                case GuildColourInteractor_1.GuildColourStatus.FAILURE_UPDATE_LIST:
                case GuildColourInteractor_1.GuildColourStatus.SUCCESS_UPDATE_LIST:
                    this.updateOrListColours(message);
                    break;
            }
            confirmer_1.confirm(message, result.type, result.message);
            return true;
        });
        /**
         * Deletes a colour from the db and the role, if it exists
         * For admins only.
         *
         * @private
         * @type {CommandFunction}
         * @memberof Colourizer
         */
        this.deleteColourEntity = (message, ots, params) => __awaiter(this, void 0, void 0, function* () {
            const guildEntity = yield this.guildHelper.findOrCreateGuild(message.guild.id);
            const guildColourInteractor = yield new GuildColourInteractor_1.default(this.connection, message, guildEntity);
            const colourController = yield new ColourController_1.default(this.connection, guildEntity);
            const colour = yield colourController.find({
                name: params.named.colourName,
            });
            if (colour === undefined) {
                confirmer_1.confirm(message, 'failure', 'Colour was not found.');
                return;
            }
            const result = yield guildColourInteractor.removeColour(colour);
            switch (result.status) {
                case GuildColourInteractor_1.GuildColourStatus.FAILURE_UPDATE_LIST:
                case GuildColourInteractor_1.GuildColourStatus.SUCCESS_UPDATE_LIST:
                    this.updateOrListColours(message);
                    break;
            }
            confirmer_1.confirm(message, result.type, result.message);
            return true;
        });
        /**
         * An initiate command for a new server.
         * Makes the initial setup process much easier.
         *
         * It will make the owner define the colour channel,
         * then an admin role,
         * then prompt it for additional, useful features.
         *
         * @private
         * @type {CommandFunction}
         * @memberof Colourizer
         */
        this.initiateNewServer = (message, opts, params, client, self) => __awaiter(this, void 0, void 0, function* () {
            const author = message.author;
            const prefix = self.defaultPrefix.str;
            const msg = yield message.channel.send(common_tags_1.stripIndents `Welcome to Colour Bot!
            It is recommended to do this command in a mod channel.
            Type \`y\` or \`n\` to confirm continue`);
            const replyMessage = yield this.getNextReply(message, author);
            if (replyMessage.content.toLowerCase().startsWith('n')
                || !replyMessage.content.toLowerCase().startsWith('y')) {
                confirmer_1.confirm(message, 'failure', 'Command was killed by calle.');
                msg.delete();
                replyMessage.delete();
                return;
            }
            replyMessage.delete();
            msg.edit(`Step 1: set a colour channel with using \`${prefix}setchannel #channel\``);
            const nextReply = yield this.getNextReply(message, author);
            const chan = nextReply.mentions.channels.first();
            if (!nextReply.content.toLowerCase().includes('setchannel')) {
                confirmer_1.confirm(message, 'failure', 'Failed to follow instructions!');
                msg.delete();
                nextReply.delete();
                return;
            }
            msg.edit(`Step 2: add your mod group in with \`${prefix}addrole admin @admins\``);
            const adminReply = yield this.getNextReply(message, author);
            if (adminReply.mentions.roles.size <= 0
                && !adminReply.content.toLowerCase().includes('addrole admin')) {
                confirmer_1.confirm(message, 'failure', 'Failed to follow instructions!');
                msg.delete();
                nextReply.delete();
                return;
            }
            adminReply.delete(1000);
            yield msg.edit(`Would you like to generate a set of standard rainbow colours?  (\`y\` or \`n\`)`);
            const generateReply = yield this.getNextReply(message, author);
            if (generateReply.content.toLowerCase().includes('y')) {
                const generateMessage = yield message.channel.send('Generating...');
                /* Chill typescript, its fine, we only need a message object. */
                yield this.generateStandardColours(generateMessage);
            }
            generateReply.delete();
            yield msg.edit(`Would you like to make help message (highly recommended!) (\`y\` or \`n\`)`);
            const helpReply = yield this.getNextReply(message, author);
            if (helpReply.content.toLowerCase().includes('y')) {
                const helpMsg = yield chan.send('Getting Help?');
                this.createChannelMessage(helpMsg);
            }
            helpReply.delete();
            yield msg.edit(`Would you like to create a colour list image? (\`y\` or \`n\`)`);
            const listReply = yield this.getNextReply(message, author);
            if (listReply.content.toLowerCase().includes('y')) {
                const listMsg = yield chan.send('Generating List!');
                /* Again, take a chill pill ts */
                this.updateOrListColours(listMsg, true);
            }
            listReply
                .delete()
                .catch(e => null);
            yield msg.edit(common_tags_1.stripIndents `Alright, initiation procedures completed!
            
            To add existing roles to bot, use 
            \`${prefix}setcolour colour_name role_name\`
            
            You can mention roles or just search by name.
            However if there are mutliple results for a role, bot will not add it.
            Make sure the role search result is unique.

            To quickly add a new colour to the bot, use
            \`${prefix}quickcolour colour_name colour_hex_code\`

            It is recommended to pin this message for reference for other admins.
            `);
            const embed = new Discord.RichEmbed()
                .setDescription(common_tags_1.stripIndents 
            // tslint:disable-next-line:max-line-length
            `__It is also recommended you run ${prefix}cycle if you already have colour roles set up__.
                An admin can do this for you, if you wish.`).setThumbnail(client.user.avatarURL);
            const prompt = yield message.channel.send({ embed });
            prompt.delete(15000);
            confirmer_1.confirm(message, 'success')
                .catch(e => null);
            return true;
        });
        /**
         * A helper utility for servers that already have colour roles.
         * It'll loop through each role, allowing the user to specify if
         * they want to add a role, and allows them to set a name for it.
         *
         * @private
         * @type {CommandFunction}
         * @memberof Colourizer
         */
        this.cycleExistingRoles = (message) => __awaiter(this, void 0, void 0, function* () {
            const roles = message.guild.roles;
            const { author } = message;
            const guildEntity = yield this.guildHelper.findOrCreateGuild(message.guild.id);
            const chan = message
                .guild
                .channels
                .find('id', guildEntity.channel);
            if (guildEntity.channel === undefined || chan === undefined) {
                confirmer_1.confirm(message, 'failure', 'Set a colour channel before running this command!', { delete: true, delay: 3000 });
                return;
            }
            const baselinePerms = Object
                .entries(roles
                .find('id', message.guild.id)
                .serialize())
                .filter(([role, has]) => has)
                .map(([role, has]) => role);
            const msg = yield message.channel.send(common_tags_1.stripIndents `
            Welcome! This command will cycle through all existing roles to add them to the bot.
            You can choose the name for each colour after a confirmation.
            It is recommended you run this command in a mod channel.
            Would you like to continue? (\`y\` or \`n\`)`);
            const reply = yield this.getNextReply(message, author);
            if (reply.content.toLowerCase().startsWith('n')) {
                reply.delete();
                confirmer_1.confirm(message, 'failure', 'Function was aborted by user!');
                return;
            }
            reply.delete();
            const guildColourInteractor = yield new GuildColourInteractor_1.default(this.connection, message, guildEntity);
            const colourController = new ColourController_1.default(this.connection, guildEntity);
            const allColours = yield colourController.index();
            const coloursTable = allColours.map(colour => [colour.roleID, colour]);
            for (const [id, role] of roles) {
                if (role.managed || role.name === '@everyone') {
                    msg.edit({ embed: { description: 'Skipping special role...' } });
                    sleep(1000);
                    continue;
                }
                const permissions = Object
                    .entries(role.serialize())
                    .filter(([role, has]) => has)
                    .map(([role, has]) => role);
                const embed = new Discord.RichEmbed()
                    .setColor(role.color)
                    .setTitle(`Role: ${role.name}`)
                    .addField('Confirm', common_tags_1.oneLineTrim `
                    Would you like to add this role? 
                    (\`y\` or \`n\` or \`cancel\` or \`finish\`)`)
                    .setDescription('The colour for this role is the highlight on the side.')
                    .addField('Warnings', (baselinePerms.length !== permissions.length)
                    ? '❌ Warning. This role may have special permissions!'
                    : '☑️ This role looks fine!');
                msg.edit({ embed });
                const reply = yield this.getNextReply(message, author);
                const contents = reply.content.toLowerCase();
                if (contents.startsWith('n')) {
                    reply.delete();
                    continue;
                }
                if (contents.startsWith('cancel')) {
                    confirmer_1.confirm(message, 'failure', 'Function was canceled!');
                    msg.delete();
                    reply.delete();
                    return;
                }
                if (contents.startsWith('finish')) {
                    reply.delete();
                    break;
                }
                if (!contents.startsWith('y')) {
                    confirmer_1.confirm(message, 'failure', 'Bad input given!');
                    reply.delete();
                    return;
                }
                reply.delete();
                const setName = new Discord.RichEmbed()
                    .setColor(role.color)
                    .addField('Name', 'Type in the color name for this role.')
                    .addField('Default', `To set as ${role.name}, type =default`, true)
                    .addField('Cancel', 'To cancel, type =cancel', true);
                msg.edit({ embed: setName });
                const name = yield this.getNextReply(message, author);
                if (name.content.toLowerCase().startsWith('=cancel')) {
                    name.delete();
                    continue;
                }
                const roleName = (name.content.toLowerCase().startsWith('=default'))
                    ? role.name
                    : name.content;
                guildColourInteractor.createOrUpdateColour(role, roleName);
                name.delete();
            }
            const generator = yield chan.send('Generating colours...!');
            this.updateOrListColours(generator, true);
            yield msg.edit({ embed: { description: `Wohoo, that's all the roles!` } });
            msg.delete(2000);
            confirmer_1.confirm(message, 'success');
            return true;
        });
    }
    /**
     * Determines if the colour list should be created,
     * or update the existing one (delete and repost list)
     *
     * @private
     * @returns
     * @memberof Colourizer
     */
    updateOrListColours(message, destroyMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            const errorHelper = (error, message, destroyMessage) => {
                (destroyMessage)
                    ? confirmer_1.confirm(message, 'failure', error, { delete: true, delay: 5000 })
                    : message.channel.send(error).then((msg) => msg.delete());
                return;
            };
            const guildEntity = yield this.guildHelper.findOrCreateGuild(message.guild.id);
            if (guildEntity.channel === undefined) {
                const error = 'Attempted to create a colour list, but no colour channel is set!';
                return errorHelper(error, message, destroyMessage);
            }
            const channel = message
                .guild
                .channels
                .get(guildEntity.channel);
            if (channel === undefined) {
                const error = 'Current colour channel could not be found! (deleted?)';
                return errorHelper(error, message, destroyMessage);
            }
            if (guildEntity.listmessage) {
                try {
                    const previous = yield channel.fetchMessage(guildEntity.listmessage);
                    if (previous) {
                        previous.delete();
                        this.guildController.update(guildEntity.id, {
                            listmessage: undefined,
                        });
                    }
                }
                catch (e) {
                    // message no real;
                    this.guildController.update(guildEntity.id, {
                        listmessage: undefined,
                    });
                }
            }
            else {
                message.channel
                    .send('Creating a new colour list!')
                    .then((msg) => msg.delete(5000));
            }
            yield this.syncColourList(channel, guildEntity);
            if (destroyMessage) {
                confirmer_1.confirm(message, 'success');
            }
        });
    }
    syncColourList(channel, guild) {
        return __awaiter(this, void 0, void 0, function* () {
            const colourController = yield new ColourController_1.default(this.connection, guild);
            const results = yield colourController.index();
            const colours = results
                .map((colour) => {
                const roleColour = channel.guild.roles.get(colour.roleID);
                if (roleColour === undefined) {
                    return;
                }
                return {
                    name: colour.name,
                    hexColour: roleColour.hexColor,
                };
            });
            // dunno, typescript doesn't want to accept my filter.
            const coloursFiltered = colours.filter(value => value !== undefined);
            const dom = listTemplate_1.default(coloursFiltered);
            const img = 'list.png';
            yield createShot(dom, img, {
                siteType: 'html',
                windowSize: {
                    height: `${results.length * 40}`,
                    width: '2500',
                },
                shotSize: {
                    height: 'all',
                    width: 'all',
                },
            });
            const newMsg = yield channel.send({ file: img });
            this.guildController.update(guild.id, {
                listmessage: newMsg.id,
            });
            return true;
        });
    }
    /**
     * Finds a role from a search instead of mentioning the colour role itself.
     * Names must be UNIQUE.
     *
     * @private
     * @param {Discord.Message} message
     * @param {string} role
     * @returns {(Promise<string | false>)}
     * @memberof Colourizer
     */
    findRole(message, role) {
        return __awaiter(this, void 0, void 0, function* () {
            const roleKey = message.mentions.roles.first();
            if (roleKey) {
                return roleKey;
            }
            const search = message.guild.roles.filter(roleObject => roleObject.name.includes(role));
            return search;
        });
    }
    /**
     *
     * Helper method for getting a user reply.
     *
     * @private
     * @param {Discord.Message} message
     * @param {Discord.User} author
     * @returns
     * @memberof Colourizer
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
exports.default = Colourizer;
