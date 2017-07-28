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
const user_1 = require("./user");
const colour_1 = require("./colour");
const typeorm_1 = require("typeorm");
require("reflect-metadata");
let Guild = class Guild {
    constructor() {
        this.users = [];
    }
};
__decorate([
    typeorm_1.PrimaryColumn(),
    typeorm_1.Index(),
    __metadata("design:type", String)
], Guild.prototype, "id", void 0);
__decorate([
    typeorm_1.OneToMany(type => colour_1.Colour, colour => colour.guild, {
        cascadeInsert: true,
        cascadeUpdate: true,
    }),
    __metadata("design:type", Array)
], Guild.prototype, "colours", void 0);
__decorate([
    typeorm_1.ManyToMany(type => user_1.User, user => user.guilds, {
        cascadeInsert: true,
        cascadeUpdate: true,
    }),
    typeorm_1.JoinColumn(),
    __metadata("design:type", Array)
], Guild.prototype, "users", void 0);
__decorate([
    typeorm_1.Column('string', { nullable: true }),
    __metadata("design:type", String)
], Guild.prototype, "channel", void 0);
__decorate([
    typeorm_1.Column('string', { nullable: true }),
    __metadata("design:type", String)
], Guild.prototype, "listmessage", void 0);
__decorate([
    typeorm_1.Column('string', { nullable: true }),
    __metadata("design:type", String)
], Guild.prototype, "helpmessage", void 0);
Guild = __decorate([
    typeorm_1.Entity(),
    typeorm_1.Index('guild_id_index', (guild) => [guild.id])
], Guild);
exports.Guild = Guild;
