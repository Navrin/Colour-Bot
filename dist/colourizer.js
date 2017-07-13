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
const actions_1 = require("./database/colour/actions");
const typeorm_1 = require("typeorm");
const simple_discordjs_1 = require("simple-discordjs");
const model_1 = require("./database/guild/model");
const model_2 = require("./database/colour/model");
const actions_2 = require("./database/guild/actions");
const model_3 = require("./database/user/model");
const actions_3 = require("./database/user/actions");
const yaml = require("js-yaml");
const Discord = require("discord.js");
const common_tags_1 = require("common-tags");
const confirmer_1 = require("./confirmer");
const escapeStringRegexp = require("escape-string-regexp");
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
};
class Colourizer {
    constructor() {
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
                    message: 'Sets a role colour to be registered.\
If no roles are mentions, perform a search for a role by name,\
and if more than one role is found, specify role name further.',
                    example: '{{{prefix}}}setcolour green @role \n\
                 {{{prefix}}}setcolour green role_name_here',
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
                        if (message.content.length <= 0) {
                            confirmer_1.confirm(message, 'failure', 'No colours given, what are you expecting?');
                        }
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
                    pattern: /(?:)/,
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
                    message: 'Creates a singleton message that keeps a list of all colours,\
automatically updated',
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
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const guild = yield guildRepo.findOneById(message.guild.id);
            if (guild && guild.channel) {
                const channel = message
                    .guild
                    .channels
                    .find('id', guild.channel);
                if (channel instanceof Discord.TextChannel) {
                    channel.send(common_tags_1.stripIndents `
                        Request a colour by typing out one of the following colours below. 

                        __**Only type just the colour, no messages before or after it.**__

                        __Don't try to talk in this channel__
                        messages are deleted automatically if they don't match a command or colour.
                    `);
                    return true;
                }
                confirmer_1.dispatch(message, 'failure', 'Channel not found!');
                return false;
            }
            confirmer_1.dispatch(message, 'failure', 'Set a colour channel first!');
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
                this.updateOrListColours(message);
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
            const colourRepo = yield this.connection.getRepository(model_2.Colour);
            const userRepo = yield this.connection.getRepository(model_3.User);
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const colour = yield colourRepo.createQueryBuilder('colour')
                .innerJoin('colour.guild.id', 'guild')
                .where('colour.guild = :guildId', { guildId: message.guild.id })
                .andWhere('colour.name LIKE :colourName', { colourName: `%${parameters.named.colour}%` })
                .getOne();
            const guild = yield guildRepo.findOneById(message.guild.id);
            if (guild == null) {
                yield confirmer_1.confirm(message, 'failure', 'Guild Error.');
                return false;
            }
            if (colour == null) {
                if (!silent) {
                    yield confirmer_1.confirm(message, 'failure', common_tags_1.oneLineTrim `Colour was not found. Check your spelling
                        of the colour, else ask an admin to add the colour.`);
                }
                return false;
            }
            const userEntitiy = (yield actions_3.findUser(message.author.id, guild, this.connection))
                || (yield actions_3.createUserIfNone(message.author, guild, this.connection, colour));
            if (userEntitiy === undefined) {
                yield confirmer_1.confirm(message, 'failure', 'Error when creating user.');
                return;
            }
            const user = yield actions_3.findUser(message.author.id, guild, this.connection);
            if (user == null) {
                message.channel.send('User is not in schema: ' + user);
                return false;
            }
            return yield this.setColourToUser(colour, this.connection, user, guild, message);
        });
        /**
         * Sets a colour to the guild schema, only to be used by admins/mods
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
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const colourRepo = yield this.connection.getRepository(model_2.Colour);
            const roleID = yield this.findRole(message, parameters.named.role);
            if (!roleID) {
                yield confirmer_1.confirm(message, 'failure', common_tags_1.oneLineTrim `No usable roles could be found!
                    Mention a role or redefine your search parameters.`);
                return false;
            }
            const guild = (yield guildRepo.findOneById(message.guild.id))
                || (yield actions_2.createGuildIfNone(message));
            this.setColourEntity(parameters.named.colour, guild, roleID, message);
            return true;
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
            for (const [colourName, colourCode] of Object.entries(standardColours)) {
                const discordGuild = message.guild;
                const oldRole = yield discordGuild.roles.find('name', `colour-${colourName}`);
                const role = (oldRole)
                    ? oldRole
                    : yield discordGuild.createRole({
                        name: `colour-${colourName}`,
                        color: colourCode,
                    });
                if (!role) {
                    continue;
                }
                const guildRepo = yield this.connection.getRepository(model_1.Guild);
                const guild = (yield guildRepo.findOneById(discordGuild.id))
                    || (yield actions_2.createGuildIfNone(message));
                if (!guild) {
                    yield confirmer_1.confirm(message, 'failure', common_tags_1.oneLineTrim `Error when setting roles,
                        guild not part of the current database.`);
                    break;
                }
                try {
                    this.setColourEntity(`colour-${colourName}`, guild, role.id, message, true, true);
                }
                catch (e) {
                    break;
                }
            }
            yield confirmer_1.confirm(message, 'success');
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
            const colour = /(?:#)?[0-9a-f]{6}/gmi.exec(params.named.colourCode);
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const guild = (yield guildRepo.findOneById(message.guild.id))
                || (yield actions_2.createGuildIfNone(message));
            if (!colour) {
                yield confirmer_1.confirm(message, 'failure', 'No colour was specified');
                return false;
            }
            const colourCode = colour[0];
            const colourEntity = yield message.guild.createRole({
                name: params.named.colourName,
                color: parseInt(colourCode.replace('#', ''), 16),
            });
            this.setColourEntity(params.named.colourName, guild, colourEntity.id, message);
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
            const colourRepo = yield this.connection.getRepository(model_2.Colour);
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const colour = yield colourRepo
                .createQueryBuilder('colour')
                .innerJoin('colour.guild', 'guild')
                .where('colour.guild = :guildID', { guildID: message.guild.id })
                .andWhere('colour.name LIKE :colourName', { colourName: params.named.colourName })
                .getOne();
            if (!colour) {
                confirmer_1.confirm(message, 'failure', 'Colour was not found, check your name with the colourlist.');
                return false;
            }
            const role = yield message.guild.roles.find('id', colour.roleID);
            if (role) {
                role.delete();
            }
            yield colourRepo.remove(colour);
            this.updateOrListColours(message);
            confirmer_1.confirm(message, 'success');
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
            const msgVec = yield message.channel.send(common_tags_1.stripIndents `Welcome to Colour Bot!
            It is recommended to do this command in a mod channel.
            Type \`y\` or \`n\` to confirm continue`);
            const msg = Array.isArray(msgVec) ? msgVec[0] : msgVec;
            const replyMessage = yield this.getNextReply(message, author);
            if (replyMessage.content.toLowerCase().startsWith('n')
                || !replyMessage.content.toLowerCase().startsWith('y')) {
                confirmer_1.confirm(message, 'failure', 'Command was killed by calle.');
                msg.delete();
                replyMessage.delete();
                return;
            }
            replyMessage.delete();
            msg.edit(`Step 1: set a colour channel with using ${prefix}setchannel #channel`);
            const nextReply = yield this.getNextReply(message, author);
            const chan = nextReply.mentions.channels.first();
            if (!nextReply.content.includes('setchannel')) {
                confirmer_1.confirm(message, 'failure', 'Failed to follow instructions!');
                msg.delete();
                nextReply.delete();
                return;
            }
            msg.edit(`Step 2: add your mod group in with ${prefix}addrole admin @admins`);
            const adminReply = yield this.getNextReply(message, author);
            if (adminReply.mentions.roles.size <= 0
                && !adminReply.content.includes('addrole')) {
                confirmer_1.confirm(message, 'failure', 'Failed to follow instructions!');
                msg.delete();
                nextReply.delete();
                return;
            }
            adminReply.delete(1000);
            yield msg.edit(`Would you like to generate a set of standard rainbow colours?  (\`y\` or \`n\`)`);
            const generateReply = yield this.getNextReply(message, author);
            if (generateReply.content.includes('y')) {
                const genVec = yield message.channel.send('Generating...');
                const genMsg = Array.isArray(genVec) ? genVec[0] : genVec;
                /* Chill typescript, its fine, we only need a message object. */
                this.generateStandardColours(genMsg);
            }
            generateReply.delete();
            yield msg.edit(`Would you like to make help message (highly recommended!) (\`y\` or \`n\`)`);
            const helpReply = yield this.getNextReply(message, author);
            if (helpReply.content.includes('y')) {
                const helpVec = yield chan.send('Getting Help?');
                const helpMsg = Array.isArray(helpVec) ? helpVec[0] : helpVec;
                this.createChannelMessage(helpMsg);
                helpMsg.delete()
                    .catch(e => null);
            }
            helpReply.delete();
            yield msg.edit(`Would you like to create a colour list image? (\`y\` or \`n\`)`);
            const listReply = yield this.getNextReply(message, author);
            if (listReply.content.includes('y')) {
                const listVec = yield chan.send('Generating List!');
                const listMsg = Array.isArray(listVec) ? listVec[0] : listVec;
                /* Again, take a chill pill ts */
                yield this.listColours(listMsg);
            }
            listReply
                .delete()
                .catch(e => null);
            msg.edit(common_tags_1.stripIndents `Alright, initiation procedures completed!
            
            To add existing roles to bot, use 
            \`${prefix}setcolour colour_name role_name\`
            
            You can mention roles or just search by name.
            However if there are mutliple results for a role, bot will not add it.
            Make sure the role search result is unique.

            To quickly add a new colour to the bot, use
            \`${prefix}quickcolour colour_name colour_hex_code\`

            It is recommended to pin this message for reference for other admins.
            `);
            const prompt = yield message.channel.send(common_tags_1.stripIndents 
            // tslint:disable-next-line:max-line-length
            `__It is also recommended you run ${prefix}cycle if you already have colour roles set up__.
            An admin can do this for you, if you wish.`);
            prompt.delete(7500);
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
            // const testSpecial = (role: Discord.Role) => {
            //     return (
            //         role.hasPermission('ADMINISTRATOR')   ||
            //         role.hasPermission('KICK_MEMBERS')    ||
            //         role.hasPermission('BAN_MEMBERS')     ||
            //         role.hasPermission('MANAGE_CHANNELS') ||
            //         role.hasPermission('MANAGE_GUILD')    ||
            //         role.hasPermission('MANAGE_MESSAGES') ||
            //         role.hasPermission('')
            //     )    
            // }
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const guild = (yield guildRepo.findOneById(message.guild.id))
                || (yield actions_2.createGuildIfNone(message));
            const chan = message
                .guild
                .channels
                .find('id', guild.channel);
            if (guild.channel === undefined || chan === undefined) {
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
            for (const [id, role] of roles) {
                if (role.managed) {
                    msg.edit('Skipping managed role...');
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
                    .addField('Warnings', (baselinePerms.length < permissions.length
                    || role.name === '@everyone')
                    ? '❌ Warning. This role may have special permissions!'
                    : '☑️ This role looks fine!');
                msg.edit({ embed });
                const reply = yield this.getNextReply(message, author);
                // TODO: fix for lower case and also adjust list.
                if (reply.content.toLowerCase().toLowerCase().startsWith('n')) {
                    reply.delete();
                    continue;
                }
                if (reply.content.toLowerCase().startsWith('cancel')) {
                    confirmer_1.confirm(message, 'failure', 'Function was canceled!');
                    msg.delete();
                    reply.delete();
                    return;
                }
                if (reply.content.toLowerCase().startsWith('finish')) {
                    reply.delete();
                    msg.delete();
                    break;
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
                this.setColourEntity(name.content.toLowerCase().startsWith('=default')
                    ? role.name
                    : name.content, guild, role.id, name, true, true);
                name.delete();
            }
            const generator = yield chan.send('Generating colours...!');
            this.updateOrListColours(generator);
            msg.edit(`Wohoo, that's all the roles!`);
            msg.delete(2000);
            confirmer_1.confirm(message, 'success');
            return true;
        });
        this.connection = typeorm_1.getConnectionManager().get();
    }
    /**
     * Determines if the colour list should be created,
     * or update the existing one (delete and repost list)
     *
     * @private
     * @param {Discord.Message} message
     * @returns
     * @memberof Colourizer
     */
    updateOrListColours(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const guild = (yield guildRepo.findOneById(message.guild.id)) ||
                (yield actions_2.createGuildIfNone(message));
            if (guild.listmessage) {
                if (!guild.channel) {
                    confirmer_1.confirm(message, 'failure', 'use setchannel to create a colour channel.');
                    return false;
                }
                const channel = message
                    .guild
                    .channels
                    .find('id', guild.channel);
                if (!channel || channel instanceof Discord.VoiceChannel) {
                    confirmer_1.confirm(message, 'failure', 'use setchannel to create a colour channel.');
                    return false;
                }
                try {
                    const msg = yield channel.fetchMessage(guild.listmessage);
                    this.syncColourList(msg);
                    confirmer_1.confirm(message, 'success');
                    return true;
                }
                catch (e) {
                    !this.singletonInProgress && this.createNewColourSingleton(message, guild);
                    return true;
                }
            }
            !this.singletonInProgress && this.createNewColourSingleton(message, guild);
            return true;
        });
    }
    /**
     * Creates a new list in the colour channel if none exists prior.
     *
     *
     * @private
     * @param {Discord.Message} message
     * @param {Guild} guild
     * @memberof Colourizer
     */
    createNewColourSingleton(message, guild) {
        return __awaiter(this, void 0, void 0, function* () {
            this.singletonInProgress = true;
            const msg = yield message.channel.send(
            // tslint:disable:max-line-length
            common_tags_1.stripIndents `The following message will be edited to a list of colours for this guild.
            These colours will automatically update on colour change.
            __Please do not delete this message__
            As images cannot be edited, do not pin the message, but the colour bot should maintain a clean (enough) channel history to keep the message at the top.`);
            // tslint:enable:max-line-length
            const singleMsg = Array.isArray(msg) ? msg[0] : msg;
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            guild.listmessage = singleMsg.id;
            guildRepo.persist(guild);
            yield sleep(7000);
            yield this.syncColourList(singleMsg);
            confirmer_1.confirm(message, 'success');
            this.singletonInProgress = false;
        });
    }
    /**
     * Updates the colour list already posted in the server.
     * This method was originally supposed to edit an embed,
     * however, the discord API does not support image editing,
     * therefore delete the image and post a new one.
     * Hacky? maybe.
     *
     * @private
     * @param {Discord.Message} message
     * @memberof Colourizer
     */
    syncColourList(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const colourRepo = yield this.connection.getRepository(model_2.Colour);
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const guild = (yield guildRepo.findOneById(message.guild.id))
                || (yield actions_2.createGuildIfNone(message));
            const results = yield colourRepo
                .createQueryBuilder('colour')
                .innerJoin('colour.guild', 'guild')
                .where('colour.guild = :guildID', { guildID: message.guild.id })
                .getMany();
            const dom = `<html style="margin: 0">
            <div id="list" style="
                font-size: 60px; 
                margin-top: 0;
                margin: 0;
                font-family: sans-serif;
                width: 100vw; 
                height: 100vh">
               ${results.map((item) => {
                const guildRole = message.guild.roles.find('id', item.roleID);
                if (!guildRole) {
                    return false;
                }
                const colour = guildRole.hexColor;
                return `
                    <div style="width: 50%; display: flex; float: left;"> 
                        <div style="
                            width: 80%; 
                            float: left;
                            text-align: center;
                            background-color: white;
                            color: ${colour}"> 
                            <span style="padding-left: 15px;">
                                ${item.name.replace('colour-', '')} 
                            </span>
                        </div>
                        <div style="
                            width: 20%; 
                            background-color: ${colour}; 
                            color: #${(0xFFFFFF ^ guildRole.color).toString(16)};
                            float: right;"> 
                            <span style="width: 80%;">
                                ${colour.replace('#', '')}
                            </span>
                        </div> 
                    </div>
                    <div style="
                        width: 50%; 
                        display: flex; 
                        float: right;
                        background-color: #36393e"> 
                        <div style="
                            width: 80%; 
                            text-align: center;
                            float: left;
                            color: ${colour}"> 
                            ${item.name.replace('colour-', '')} 
                        </div>
                        <div style="
                            width: 20%; 
                            background-color: ${colour}; 
                            color: #${(0xFFFFFF ^ guildRole.color).toString(16)};
                            float: right;"> 
                            <span style="width: 80%;">
                                ${colour.replace('#', '')}
                            </span>
                        </div> 
                    </div>`;
            }).join('\n')}
            </div>
        </html>`;
            const yamler = yaml.dump(results.map((colourItem) => {
                return {
                    name: colourItem.name.replace('colour-', ''),
                };
            }));
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
            const newMsgResolve = yield message.channel.send({ file: img });
            const newMessage = (Array.isArray(newMsgResolve)) ? newMsgResolve[0] : newMsgResolve;
            guild.listmessage = newMessage.id;
            guildRepo.persist(guild);
            message.delete()
                .catch((e) => {
                // message was probably deleted by something else.
            });
        });
    }
    /**
     * Persist a colour to the user entity for the guild.
     * @param newColour
     * @param connection
     * @param user
     * @param guild
     * @param message
     */
    setColourToUser(newColour, connection, user, guild, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userRepo = yield connection.getRepository(model_3.User);
                const colourRepo = yield connection.getRepository(model_2.Colour);
                const guildRepo = yield connection.getRepository(model_1.Guild);
                const colourList = yield colourRepo.find();
                if (user.colours[0] !== undefined) {
                    const oldColour = message.guild.roles.get(user.colours[0].roleID);
                    if (oldColour === undefined) {
                        confirmer_1.confirm(message, 'failure', 'Error setting colour!');
                        return false;
                    }
                    yield message.guild.member(message.author).removeRole(oldColour);
                }
                const userMember = message.guild.member(message.author.id);
                const possibleColours = colourList
                    .map(colour => userMember.roles.find('name', colour.name))
                    .filter(id => id);
                yield userMember.removeRoles(possibleColours);
                const updatedUser = yield userRepo.persist(user);
                user.colours.push(newColour);
                yield colourRepo.persist(newColour);
                yield userRepo.persist(user);
                yield guildRepo.persist(guild);
                const nextColour = message.guild.roles.get(newColour.roleID.toString());
                if (nextColour === undefined) {
                    confirmer_1.confirm(message, 'failure', 'Error getting colour!');
                    return false;
                }
                try {
                    yield message.guild.member(message.author).addRole(nextColour);
                    confirmer_1.confirm(message, 'success', undefined, { delay: 1000, delete: true });
                }
                catch (e) {
                    confirmer_1.confirm(message, 'failure', `Error setting colour: ${e}`, { delay: 3000, delete: true });
                }
                return true;
            }
            catch (e) {
                confirmer_1.confirm(message, 'failure', `error: ${e}`);
                return false;
            }
        });
    }
    /**
     * Adds the colour to the guild database.
     *
     * @private
     * @param {string} colourName
     * @param {Guild} guild
     * @param {string} roleID
     * @param {Discord.Message} message
     * @param {boolean} [silent=false]
     * @returns
     * @memberof Colourizer
     */
    setColourEntity(colourName, guild, roleID, message, silent = false, noListUpdate = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const colourRepo = yield this.connection.getRepository(model_2.Colour);
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const colour = yield colourRepo
                .createQueryBuilder('colour')
                .innerJoin('colour.guild', 'guild')
                .where('colour.guild = :guildID', { guildID: guild.id })
                .andWhere('colour.name LIKE :colourName', { colourName })
                .getOne();
            if (colour === undefined) {
                const newColour = yield actions_1.createNewColour(message, colourName, roleID);
                if (!newColour) {
                    confirmer_1.confirm(message, 'failure', 'Failure setting colour!');
                    throw new Error('Colour failure!');
                }
                if (!silent) {
                    confirmer_1.confirm(message, 'success');
                }
                if (!noListUpdate) {
                    this.updateOrListColours(message);
                }
                return true;
            }
            try {
                colour.guild = guild;
                colour.roleID = roleID;
                yield colourRepo.persist(colour);
                yield guildRepo.persist(guild);
                if (!silent) {
                    confirmer_1.confirm(message, 'success');
                }
                if (!noListUpdate) {
                    this.updateOrListColours(message);
                }
                return true;
            }
            catch (e) {
                confirmer_1.confirm(message, 'failure', `Error when updating colour: ${e.toString()}`);
                throw new Error('Colour failure!');
            }
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
            const roleKey = message.mentions.roles.firstKey();
            if (roleKey) {
                return roleKey;
            }
            const search = message.guild.roles.filter(roleObject => roleObject.name.includes(role));
            if (search.size > 1) {
                yield confirmer_1.confirm(message, 'failure', common_tags_1.stripIndents `Multiple results found for the search ${role}!
                Expected one role, found: 
                    ${search
                    .map(roleOjb => `Rolename: ${roleOjb.name.replace('@', '')}`)
                    .join('\n')}
                `, { delay: 10000, delete: true });
                return false;
            }
            return search.firstKey();
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
