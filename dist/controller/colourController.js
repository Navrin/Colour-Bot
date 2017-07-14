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
const model_1 = require("../database/colour/model");
const model_2 = require("../database/guild/model");
const typeorm_1 = require("typeorm");
class ColourController {
    constructor(guild) {
        this.connection = typeorm_1.getConnectionManager().get();
        this.guildRepo = this.connection.getRepository(model_2.Guild);
        this.colourRepo = this.connection.getRepository(model_1.Colour);
    }
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            const guildEntity = yield this.guildRepo.findOne({
                alias: 'guild',
                id: this.guild.id,
                innerJoinAndSelect: {
                    colours: 'guild.colours',
                },
            });
            if (guildEntity == null) {
                throw new TypeError('Guild does not exist!');
            }
            return guildEntity.colours;
        });
    }
    read(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const colour = yield this.colourRepo.findOneById(id);
            return colour;
        });
    }
    find(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const colour = yield this.colourRepo
                .createQueryBuilder('colour')
                .where('colour.guild = :guild', { guild: this.guild.id })
                .andWhere('colour.name LIKE :colour', { colour: `%${name}%` })
                .getOne();
            return colour;
        });
    }
    create(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const colour = new model_1.Colour();
            colour.roleID = payload.roleID;
            colour.name = payload.name;
            colour.guild = this.guild;
            const colourEntity = yield this.colourRepo.persist(colour);
            return colourEntity;
        });
    }
    update(id, details) {
        return __awaiter(this, void 0, void 0, function* () {
            const colour = yield this.colourRepo.findOneById(id);
            if (colour == null) {
                throw new TypeError('Colour does not exist!');
            }
            const payload = Object.assign({}, colour, details);
            const updatedColour = yield this.colourRepo.preload(payload);
            return updatedColour;
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const colour = yield this.read(id);
            if (colour === undefined) {
                throw new TypeError('Colour does not exist!');
            }
            try {
                const success = yield this.colourRepo.remove(colour);
                return true;
            }
            catch (e) {
                console.log(e);
                return false;
            }
        });
    }
}
exports.default = ColourController;
