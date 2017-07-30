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
const typeorm_1 = require("typeorm");
const guild_1 = require("./guild");
const user_1 = require("./user");
require("reflect-metadata");
let ColourRequest = class ColourRequest {
};
__decorate([
    typeorm_1.PrimaryGeneratedColumn(),
    typeorm_1.Index(),
    __metadata("design:type", Number)
], ColourRequest.prototype, "id", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", String)
], ColourRequest.prototype, "colour", void 0);
__decorate([
    typeorm_1.ManyToOne(type => guild_1.Guild, {
        cascadeAll: true,
    }),
    __metadata("design:type", guild_1.Guild)
], ColourRequest.prototype, "guild", void 0);
__decorate([
    typeorm_1.ManyToOne(type => user_1.User, {
        cascadeAll: true,
    }),
    __metadata("design:type", user_1.User)
], ColourRequest.prototype, "user", void 0);
ColourRequest = __decorate([
    typeorm_1.Entity(),
    typeorm_1.Index('request_id_index', (request) => [request.id])
], ColourRequest);
exports.ColourRequest = ColourRequest;
