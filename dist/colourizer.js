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
const common_tags_1 = require("common-tags");
const dispatch_1 = require("./dispatch");
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
                    action: (message, options, params, client) => __awaiter(this, void 0, void 0, function* () {
                        const res = new RegExp(`[a-zA-Z\s]+`).exec(message.content);
                        if (res && !message.content.startsWith(prefix)) {
                            yield this
                                .getColour(message, options, Object.assign({}, params, { named: Object.assign({}, params.named, { colour: res[0] }) }), client);
                        }
                        return false;
                    }),
                    names: ['colourdirty'],
                    noPrefix: true,
                    pattern: /[a-zA-Z\s]+/,
                },
                custom: {
                    locked: true,
                },
            };
        };
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
        /*********************
         * COMMAND FUNCTIONS *
         *********************/
        /**
         * Create a list of colours currently in the guild schema
         * // TODO Create a singleton message for each guild that can be pinned
         * // TODO Have the singleton automatically be edited on colour changes.
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
        this.getColour = (message, options, parameters, client, silent = false) => __awaiter(this, void 0, void 0, function* () {
            const colourRepo = yield this.connection.getRepository(model_2.Colour);
            const userRepo = yield this.connection.getRepository(model_3.User);
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const colour = yield colourRepo.createQueryBuilder('colour')
                .innerJoin('colour.guild.id', 'guild')
                .where('colour.guild = :guildId', { guildId: message.guild.id })
                .andWhere('colour.name LIKE :colourName', { colourName: `%${parameters.named.colour}` })
                .getOne();
            const guild = yield guildRepo.findOneById(message.guild.id);
            if (guild == null) {
                yield dispatch_1.dispatch(message, 'Guild Error.');
                return false;
            }
            if (colour == null) {
                if (!silent) {
                    yield dispatch_1.dispatch(message, 'Colour was not found. Check your spelling\
of the colour, else ask an admin to add the colour.');
                }
                return false;
            }
            const userEntitiy = (yield actions_3.findUser(message.author.id, guild, this.connection))
                || (yield actions_3.createUserIfNone(message.author, guild, this.connection, colour));
            const user = yield userRepo
                .createQueryBuilder('user')
                .innerJoin('user.guild', 'guild', 'user.guild = guild.id')
                .innerJoin('user.colour', 'colour', 'user.colour = colour.id')
                .where('user.id = :userid', { userid: userEntitiy.id })
                .getOne();
            if (user == null) {
                message.channel.send('User is not in schema: ', user);
                return false;
            }
            return yield actions_3.setColourToUser(colour, this.connection, user, guild, message);
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
                yield dispatch_1.dispatch(message, `No usable roles could be found! \
Mention a role or redefine your search parameters.`);
                return false;
            }
            const guild = yield guildRepo.findOneById(message.guild.id);
            if (guild === undefined) {
                const newGuild = yield actions_2.createGuildIfNone(message);
                this.setColourEntity(parameters.named.colour, newGuild, roleID, message);
                return true;
            }
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
                    yield dispatch_1.dispatch(message, 'Error when setting roles,\
guild not part of the current database.');
                    return false;
                }
                this.setColourEntity(`colour-${colourName}`, guild, role.id, message, true);
            }
            yield dispatch_1.dispatch(message, 'Colours have been added (or regenerated)!');
            return true;
        });
        /**
         * Quick utility method for mods to create a new colour role quickly.
         * c.quickcolour {{name}} {{colour_code}}
         * // TODO allow colour code to accept a #
         *
         * @private
         * @type {CommandFunction}
         * @memberof Colour>:(izer
         */
        this.quickCreateColour = (message, options, params) => __awaiter(this, void 0, void 0, function* () {
            const colour = /(?:#)?[0-9a-f]{6}/gmi.exec(params.named.colourCode);
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const guild = (yield guildRepo.findOneById(message.guild.id))
                || (yield actions_2.createGuildIfNone(message));
            if (!colour) {
                yield dispatch_1.dispatch(message, 'No colour was specified');
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
        this.connection = typeorm_1.getConnectionManager().get();
    }
    updateOrListColours(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const guild = (yield guildRepo.findOneById(message.guild.id)) ||
                (yield actions_2.createGuildIfNone(message));
            if (guild.listmessage) {
                const channel = message
                    .guild
                    .channels
                    .find('id', guild.channel);
                if (!channel) {
                    message.channel.send('use setchannel to create a colour channel.');
                    return false;
                }
                const msg = yield channel.fetchMessage(guild.listmessage);
                if (!msg) {
                    this.createNewColourSingleton(message, guild);
                }
                this.syncColourList(msg);
                return true;
            }
            this.createNewColourSingleton(message, guild);
        });
    }
    createNewColourSingleton(message, guild) {
        return __awaiter(this, void 0, void 0, function* () {
            const msg = yield message.channel.send(`The following message will be edited to a list of colours for this guild.
These colours will automatically update on colour change.
__Please do not delete this message__
Pin it if you wish, but the colour bot should maintain a clean (enough) channel history.`);
            const singleMsg = Array.isArray(msg) ? msg[0] : msg;
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            guild.listmessage = singleMsg.id;
            guildRepo.persist(guild);
            yield sleep(3000);
            this.syncColourList(singleMsg);
        });
    }
    syncColourList(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const colourRepo = yield this.connection.getRepository(model_2.Colour);
            const results = yield colourRepo
                .createQueryBuilder('colour')
                .innerJoin('colour.guild', 'guild')
                .where('colour.guild = :guildID', { guildID: message.guild.id })
                .getMany();
            const yamler = yaml.dump(results.map((colourItem) => {
                return {
                    name: colourItem.name.replace('colour-', ''),
                };
            }));
            message.edit(yamler);
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
    setColourEntity(colourName, guild, roleID, message, silent = false) {
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
                    dispatch_1.dispatch(message, `Colour wasn't created. Aborting function...`);
                    return false;
                }
                if (!silent) {
                    dispatch_1.dispatch(message, 'Colour has successfully been added to the list!');
                }
                this.updateOrListColours(message);
                return true;
            }
            try {
                colour.guild = guild;
                colour.roleID = roleID;
                yield colourRepo.persist(colour);
                yield guildRepo.persist(guild);
                if (!silent) {
                    dispatch_1.dispatch(message, `Colour role has successfully been updated!`);
                }
                this.updateOrListColours(message);
                return true;
            }
            catch (e) {
                dispatch_1.dispatch(message, `Error when updating colour: ${e.toString()}`);
                return false;
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
                yield dispatch_1.dispatch(message, common_tags_1.stripIndents `Multiple results found for the search ${role}!
            Expected one role, found: 

            ${search
                    .map(roleOjb => `Rolename: ${roleOjb.name.replace('@', '')}`)
                    .join('\n')}`, undefined, { delete: false });
                return false;
            }
            return search.firstKey();
        });
    }
}
exports.default = Colourizer;
