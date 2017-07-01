import { getConnectionManager, ConnectionOptions } from 'typeorm';
import entities from './entities';

const connectionOptions: ConnectionOptions = {
    driver: {
        type: 'sqlite',
        storage: 'colourful.db',
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
