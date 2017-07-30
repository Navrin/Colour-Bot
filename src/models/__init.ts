import { ColourRequest } from './colourRequest';
import { getConnectionManager, ConnectionOptions } from 'typeorm';
import { Colour } from './colour';
import { Guild } from './guild';
import { User } from './user';

const connectionOptions: ConnectionOptions = {
    driver: require('../../typeorm.json'),
    entities: [
        Colour,
        Guild,
        User,
        ColourRequest,
    ],
    autoSchemaSync: true,
    autoMigrationsRun: true,
};

const connectionManager = getConnectionManager();
export default connectionManager.createAndConnect(connectionOptions)
    .catch(e => console.log(e));
