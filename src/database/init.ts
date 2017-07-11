import { getConnectionManager, ConnectionOptions } from 'typeorm';
import entities from './entities';

const connectionOptions: ConnectionOptions = {
    driver: {
        type: 'postgres',
        username: 'nav',
        port: 5432,
        host: 'localhost',
        database: 'colourbot',
    },
    entities: [
        ...entities,
    ],
    autoSchemaSync: true,
    autoMigrationsRun: true,
};


const connectionManager = getConnectionManager();
export default connectionManager.createAndConnect(connectionOptions)
    .catch(e => console.log(e));
