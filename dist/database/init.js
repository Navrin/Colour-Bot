"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const entities_1 = require("./entities");
const connectionOptions = {
    driver: require('../../typeorm.json'),
    entities: [
        ...entities_1.default,
    ],
    autoSchemaSync: true,
    autoMigrationsRun: true,
};
const connectionManager = typeorm_1.getConnectionManager();
exports.default = connectionManager.createAndConnect(connectionOptions)
    .catch(e => console.log(e));
