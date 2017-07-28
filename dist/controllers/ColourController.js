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
const colour_1 = require("../models/colour");
const guild_1 = require("../models/guild");
class ColourController {
    /**
     * Creates an instance of ColourController.
     * Controls the colour creations and searches based on the parent gulid.
     * @param {Guild} guild
     * @memberof ColourController
     */
    constructor(connection, guild) {
        this.connection = connection;
        this.guildRepo = this.connection.getRepository(guild_1.Guild);
        this.colourRepo = this.connection.getRepository(colour_1.Colour);
        this.guild = guild;
    }
    /**
     * List all colours for the current guild
     *
     * @returns
     * @memberof ColourController
     */
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            const guildEntity = yield this.guildRepo
                .createQueryBuilder('guild')
                .where('guild.id = :guild', { guild: this.guild.id })
                .innerJoinAndSelect('guild.colours', 'colour', 'colour.guild = guild.id')
                .getOne();
            if (guildEntity == null) {
                throw new TypeError('Guild does not exist!');
            }
            return guildEntity.colours;
        });
    }
    /**
     * Get a colour via it's given ID.
     *
     * @param {string} id
     * @returns
     * @memberof ColourController
     */
    read(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const colour = yield this.colourRepo.findOneById(id);
            return colour;
        });
    }
    /**
     * Find a given colour based on its name or roleID.
     * Names match very loosely, will find the closest match.
     *
     *
     * @param {string} name
     * @returns
     * @memberof ColourController
     */
    find({ name, roleID }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (name) {
                return yield this.colourRepo
                    .createQueryBuilder('colour')
                    .where('colour.guild = :guild', { guild: this.guild.id })
                    .andWhere('colour.name ILIKE :colour', { colour: `%${name}%` })
                    .getOne();
            }
            return yield this.colourRepo.findOne({
                roleID,
            });
        });
    }
    /**
     * Create a given colour based on it's payload.
     *
     * @param {ColourCreateOptions} payload
     * @returns
     * @memberof ColourController
     */
    create(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const colour = new colour_1.Colour();
            colour.roleID = payload.roleID;
            colour.name = payload.name;
            colour.guild = this.guild;
            const colourEntity = yield this.colourRepo.persist(colour);
            const updatedGuildEntity = yield this.guildRepo.persist(this.guild);
            this.guild = updatedGuildEntity;
            return colourEntity;
        });
    }
    /**
     * Finds a colour entity via the id, merges the details and updates
     * the entity in the schema.
     *
     * @param {number} id
     * @param {ColourUpdateOptions} details
     * @returns
     * @memberof ColourController
     */
    update(id, details) {
        return __awaiter(this, void 0, void 0, function* () {
            const colour = yield this.colourRepo.findOneById(id);
            if (colour == null) {
                throw new TypeError('Colour does not exist!');
            }
            for (const [key, value] of Object.entries(details)) {
                if (Array.isArray(value)) {
                    // merge the original guild value array with the payload array.
                    colour[key] = [...colour[key], ...value];
                }
                else {
                    colour[key] = value;
                }
            }
            const updatedColour = yield this.colourRepo.persist(colour);
            return updatedColour;
        });
    }
    /**
     * Deletes a given colour via it's ID.
     *
     * @param {string} id
     * @returns
     * @memberof ColourController
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const colour = yield this.read(id);
            if (colour == null) {
                throw new TypeError('Colour does not exist!');
            }
            try {
                const success = yield this.colourRepo.remove(colour);
                return true;
            }
            catch (e) {
                return false;
            }
        });
    }
}
exports.default = ColourController;
