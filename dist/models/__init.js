"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const colour_1 = require("./colour");
const guild_1 = require("./guild");
const user_1 = require("./user");
const connectionOptions = {
    driver: require('../../typeorm.json'),
    entities: [
        colour_1.Colour,
        guild_1.Guild,
        user_1.User,
    ],
    autoSchemaSync: true,
    autoMigrationsRun: true,
};
const connectionManager = typeorm_1.getConnectionManager();
exports.default = connectionManager.createAndConnect(connectionOptions)
    .catch(e => console.log(e));
