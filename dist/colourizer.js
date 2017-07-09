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
const emojis_1 = require("./emojis");
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
                        const res = new RegExp(`(.\s?)+`).exec(message.content);
                        if (res && !message.content.startsWith(prefix)) {
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
                        emojis_1.confirm(message, 'failure', 'Command does not exist!', { delay: 1500, delete: true });
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
                yield emojis_1.confirm(message, 'failure', 'Guild Error.');
                return false;
            }
            if (colour == null) {
                if (!silent) {
                    yield emojis_1.confirm(message, 'failure', 'Colour was not found. Check your spelling \
of the colour, else ask an admin to add the colour.');
                }
                return false;
            }
            const userEntitiy = (yield actions_3.findUser(message.author.id, guild, this.connection))
                || (yield actions_3.createUserIfNone(message.author, guild, this.connection, colour));
            if (userEntitiy === undefined) {
                yield emojis_1.confirm(message, 'failure', 'Error when creating user.');
                return;
            }
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
                yield emojis_1.confirm(message, 'failure', `No usable roles could be found! \
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
                    yield emojis_1.confirm(message, 'failure', 'Error when setting roles,\
guild not part of the current database.');
                    break;
                }
                try {
                    this.setColourEntity(`colour-${colourName}`, guild, role.id, message, true, true);
                }
                catch (e) {
                    break;
                }
            }
            yield emojis_1.confirm(message, 'success');
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
                yield emojis_1.confirm(message, 'failure', 'No colour was specified');
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
                emojis_1.confirm(message, 'failure', 'Colour was not found, check your name with the colourlist.');
                return false;
            }
            const role = yield message.guild.roles.find('id', colour.roleID);
            if (role) {
                role.delete();
            }
            yield colourRepo.remove(colour);
            this.updateOrListColours(message);
            emojis_1.confirm(message, 'success');
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
                if (!guild.channel) {
                    emojis_1.confirm(message, 'failure', 'use setchannel to create a colour channel.');
                    return false;
                }
                const channel = message
                    .guild
                    .channels
                    .find('id', guild.channel);
                if (!channel || channel instanceof Discord.VoiceChannel) {
                    emojis_1.confirm(message, 'failure', 'use setchannel to create a colour channel.');
                    return false;
                }
                try {
                    const msg = yield channel.fetchMessage(guild.listmessage);
                    this.syncColourList(msg);
                    emojis_1.confirm(message, 'success');
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
    createNewColourSingleton(message, guild) {
        return __awaiter(this, void 0, void 0, function* () {
            this.singletonInProgress = true;
            const msg = yield message.channel.send(`The following message will be edited to a list of colours for this guild.
These colours will automatically update on colour change.
__Please do not delete this message__
As images cannot be edited, do not pin the message, \
but the colour bot should maintain a clean (enough) \ 
channel history to keep the message at the top.`);
            const singleMsg = Array.isArray(msg) ? msg[0] : msg;
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            guild.listmessage = singleMsg.id;
            guildRepo.persist(guild);
            yield sleep(7000);
            yield this.syncColourList(singleMsg);
            emojis_1.confirm(message, 'success');
            this.singletonInProgress = false;
        });
    }
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
            const dom = `<html>
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
                            width: 50%; 
                            float: left;
                            background-color: white;
                            color: ${colour}"> 
                            <span style="padding-left: 15px;">
                                ${item.name.replace('colour-', '')} 
                            </span>
                        </div>
                        <div style="
                            width: 50%; 
                            background-color: ${colour}; 
                            color: #${(0xFFFFFF - guildRole.color).toString(16)};
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
                            width: 50%; 
                            float: left;
                            color: ${colour}"> 
                            ${item.name.replace('colour-', '')} 
                        </div>
                        <div style="
                            width: 50%; 
                            background-color: ${colour}; 
                            color: #${(0xFFFFFF - guildRole.color).toString(16)};
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
                if (user.colour !== undefined) {
                    const oldColour = message.guild.roles.get(user.colour.roleID);
                    if (oldColour === undefined) {
                        emojis_1.confirm(message, 'failure', 'Error setting colour!');
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
                user.colour = newColour;
                yield colourRepo.persist(newColour);
                yield userRepo.persist(user);
                yield guildRepo.persist(guild);
                const nextColour = message.guild.roles.get(newColour.roleID.toString());
                if (nextColour === undefined) {
                    emojis_1.confirm(message, 'failure', 'Error getting colour!');
                    return false;
                }
                try {
                    yield message.guild.member(message.author).addRole(nextColour);
                    emojis_1.confirm(message, 'success', undefined, { delay: 1000, delete: true });
                }
                catch (e) {
                    emojis_1.confirm(message, 'failure', `Error setting colour: ${e}`, { delay: 3000, delete: true });
                }
                return true;
            }
            catch (e) {
                emojis_1.confirm(message, 'failure', `error: ${e}`);
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
                    emojis_1.confirm(message, 'failure', 'Failure setting colour!');
                    throw new Error('Colour failure!');
                }
                if (!silent) {
                    emojis_1.confirm(message, 'success');
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
                    emojis_1.confirm(message, 'success');
                }
                if (!noListUpdate) {
                    this.updateOrListColours(message);
                }
                return true;
            }
            catch (e) {
                emojis_1.confirm(message, 'failure', `Error when updating colour: ${e.toString()}`);
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
                yield emojis_1.confirm(message, 'failure', common_tags_1.stripIndents `Multiple results found for the search ${role}!
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
}
exports.default = Colourizer;
