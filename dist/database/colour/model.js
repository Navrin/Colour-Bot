"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const model_1 = require("./../user/model");
const model_2 = require("./../guild/model");
const typeorm_1 = require("typeorm");
require("reflect-metadata");
let Colour = class Colour {
};
__decorate([
    typeorm_1.PrimaryGeneratedColumn(),
    typeorm_1.Index(),
    __metadata("design:type", Number)
], Colour.prototype, "id", void 0);
__decorate([
    typeorm_1.Column(),
    typeorm_1.Index(),
    __metadata("design:type", String)
], Colour.prototype, "name", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", String)
], Colour.prototype, "roleID", void 0);
__decorate([
    typeorm_1.ManyToMany(type => model_1.User, user => user.colours, {
        cascadeInsert: true,
        cascadeUpdate: true,
    }),
    typeorm_1.JoinColumn(),
    __metadata("design:type", Array)
], Colour.prototype, "users", void 0);
__decorate([
    typeorm_1.ManyToOne(type => model_2.Guild, guild => guild.colours),
    __metadata("design:type", model_2.Guild)
], Colour.prototype, "guild", void 0);
Colour = __decorate([
    typeorm_1.Entity(),
    typeorm_1.Index('colour_id_and_name_index', (colour) => [colour.name, colour.id])
], Colour);
exports.Colour = Colour;
