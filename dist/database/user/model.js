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
const model_1 = require("./../guild/model");
const typeorm_1 = require("typeorm");
const model_2 = require("../colour/model");
require("reflect-metadata");
let User = class User {
};
__decorate([
    typeorm_1.PrimaryColumn(),
    typeorm_1.Index(),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    typeorm_1.ManyToMany(type => model_2.Colour, colour => colour.users),
    typeorm_1.JoinTable(),
    __metadata("design:type", Array)
], User.prototype, "colours", void 0);
__decorate([
    typeorm_1.ManyToMany(type => model_1.Guild, guild => guild.users),
    typeorm_1.JoinTable(),
    __metadata("design:type", Array)
], User.prototype, "guilds", void 0);
User = __decorate([
    typeorm_1.Entity(),
    typeorm_1.Index('user_id_index', (user) => [user.id])
], User);
exports.User = User;
