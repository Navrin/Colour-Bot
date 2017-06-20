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
const discordjs_commands_1 = require("discordjs-commands");
const model_1 = require("./database/guild/model");
const model_2 = require("./database/colour/model");
const actions_2 = require("./database/guild/actions");
const model_3 = require("./database/user/model");
const actions_3 = require("./database/user/actions");
const yaml = require("js-yaml");
const common_tags_1 = require("common-tags");
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
        this.getSetCommand = () => {
            return {
                authentication: discordjs_commands_1.RoleTypes.ADMIN,
                command: {
                    action: this.setColour,
                    names: ['setcolor', 'setcolour'],
                    parameters: '{{colour}} {{role}}'
                },
                description: {
                    message: 'Sets a role colour to be registered. If no roles are mentions, perform a search for a role by name, and if more than one role is found, specify role name further.',
                    example: '{{{prefix}}}setcolour green @role \n {{{prefix}}}setcolour green role_name_here',
                }
            };
        };
        this.getColourCommand = () => {
            return {
                command: {
                    action: this.getColour,
                    names: ['colour', 'addcolour', 'getcolour', 'color', 'addcolor', 'getcolor', ''],
                    noPrefix: true,
                    parameters: '{{colour}}'
                },
                description: {
                    message: 'Set a colour role to yourself',
                    example: '{{{prefix}}}getcolour green'
                }
            };
        };
        this.getListCommand = () => {
            return {
                command: {
                    action: this.listColours,
                    names: ['allcolours', 'colours', 'allcolors', 'colors'],
                },
                description: {
                    message: 'Lists all all the avaliable colours in a yaml format.',
                    example: '{{{prefix}}}colours'
                }
            };
        };
        this.getGenerateColours = () => {
            return {
                command: {
                    action: this.generateStandardColours,
                    names: ['generate', 'generate_colours'],
                },
                authentication: discordjs_commands_1.RoleTypes.ADMIN,
                description: {
                    message: 'Generates a set of starter colours. (ADMIN ONLY)',
                    example: '{{{prefix}}}generate',
                }
            };
        };
        this.listColours = (message) => __awaiter(this, void 0, void 0, function* () {
            try {
                const colourRepo = yield this.connection.getRepository(model_2.Colour);
                const msg = yield message.channel.send(`Searching colours...`);
                const results = yield colourRepo
                    .createQueryBuilder('colour')
                    .innerJoin('colour.guild', 'guild')
                    .where('colour.guild = :guildID', { guildID: parseInt(message.guild.id, 10) })
                    .getMany();
                const yamler = yaml.dump(results.map((colourItem) => {
                    return {
                        name: colourItem.name,
                    };
                }));
                const searchMsg = (Array.isArray(msg)) ? msg[0] : msg;
                searchMsg.edit(yamler);
                return true;
            }
            catch (e) {
                return false;
            }
        });
        this.getColour = (message, options, parameters) => __awaiter(this, void 0, void 0, function* () {
            const colourRepo = yield this.connection.getRepository(model_2.Colour);
            const userRepo = yield this.connection.getRepository(model_3.User);
            const colour = yield colourRepo.createQueryBuilder('colour')
                .innerJoin('colour.guild.id', 'guild')
                .where('colour.guild = :guildId', { guildId: parseInt(message.guild.id, 10) })
                .andWhere('colour.name LIKE :colourName', { colourName: `%${parameters.named.colour}%` })
                .getOne();
            if (colour == null) {
                message.channel.send(`Colour was not found. Check your spelling of the colour, else ask an admin to add the colour.`);
                return false;
            }
            const userEntitiy = (yield userRepo.findOneById(parseInt(message.author.id, 10)))
                || (yield actions_3.createUserIfNone(message.author, this.connection, colour));
            const userList = yield userRepo.find({
                alias: 'user',
                innerJoinAndSelect: {
                    'colour': 'user.colour'
                }
            });
            const user = userList[0];
            return yield actions_3.setColourToUser(colour, this.connection, user, message);
        });
        this.setColour = (message, options, parameters) => __awaiter(this, void 0, void 0, function* () {
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const colourRepo = yield this.connection.getRepository(model_2.Colour);
            const roleID = this.findRole(message, parameters.named.role);
            if (!roleID) {
                message.channel.send(`No usable roles could be found! Mention a role or redefine your search parameters.`);
                return false;
            }
            const guild = yield guildRepo.findOneById(parseInt(message.guild.id, 10));
            if (guild === undefined) {
                const newGuild = yield actions_2.createGuildIfNone(message);
                this.setColourEntity(parameters.named.colour, newGuild, roleID, message);
                return true;
            }
            this.setColourEntity(parameters.named.colour, guild, roleID, message);
            return true;
        });
        this.generateStandardColours = (message) => __awaiter(this, void 0, void 0, function* () {
            for (const [colourName, colourCode] of Object.entries(standardColours)) {
                const discordGuild = message.guild;
                const oldRole = yield discordGuild.roles.find("name", `colour-${colourName}`);
                const role = (oldRole) ? oldRole : yield discordGuild.createRole({ name: `colour-${colourName}`, color: colourCode });
                if (!role) {
                    continue;
                }
                const guildRepo = yield this.connection.getRepository(model_1.Guild);
                const guild = (yield guildRepo.findOneById(parseInt(discordGuild.id, 10)))
                    || (yield actions_2.createGuildIfNone(message));
                if (!guild) {
                    message.channel.send('Error when setting roles, guild not part of the current database.');
                    break;
                }
                this.setColourEntity(`colour-${colourName}`, guild, role.id, message, true);
            }
            message.channel.send('Colours have been added (or regenerated)!');
            return true;
        });
        this.connection = typeorm_1.getConnectionManager().get();
    }
    setColourEntity(colourName, guild, roleID, message, silent = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const colourRepo = yield this.connection.getRepository(model_2.Colour);
            const guildRepo = yield this.connection.getRepository(model_1.Guild);
            const colour = yield colourRepo
                .createQueryBuilder('colour')
                .innerJoin('colour.guild', 'guild')
                .where('colour.guild = :guildID', { guildID: guild.id })
                .andWhere('colour.name LIKE :colourName', { colourName: colourName })
                .getOne();
            if (colour == undefined) {
                const newColour = yield actions_1.createNewColour(message, colourName, roleID);
                if (!newColour) {
                    message.channel.send(`Colour wasn't created. Aborting function...`);
                    return false;
                }
                if (!silent) {
                    message.channel.send('Colour has successfully been added to the list!');
                }
                return true;
            }
            try {
                colour.guild = guild;
                colour.roleID = roleID;
                yield colourRepo.persist(colour);
                yield guildRepo.persist(guild);
                if (!silent) {
                    message.channel.send(`Colour role has successfully been updated!`);
                }
                return true;
            }
            catch (e) {
                message.channel.send(`Error when updating colour: ${e.toString()}`);
                return false;
            }
        });
    }
    findRole(message, role) {
        const roleKey = message.mentions.roles.firstKey();
        if (roleKey) {
            return roleKey;
        }
        const search = message.guild.roles.filter((roleObject) => roleObject.name.includes(role));
        if (search.size > 1) {
            message.channel.send(common_tags_1.stripIndents `Multiple results found for the search ${role}!
            Expected one role, found: 

            ${search
                .map(roleOjb => `Rolename: ${roleOjb.name.replace('@', '')}`)
                .join('\n')}`);
            return false;
        }
        return search.firstKey();
    }
}
exports.default = Colourizer;
