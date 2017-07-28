import { Connection, getConnectionManager } from 'typeorm';
import GuildController from '../controllers/GuildController';
import { Guild } from '../models/guild';


export default
class GuildHelper {
    controller: GuildController;
    constructor(connection: Connection) {
        this.controller = new GuildController(connection);
    }
    
    /**
     * Find an existing guild based on id or create a new one.
     * 
     * @param {string} id 
     * @memberof GuildHelper
     */
    async findOrCreateGuild(id: string) {
        const repo = 
            await getConnectionManager()
                .get()
                .getRepository(Guild);
        
        const maybeGuild = 
            await repo.findOneById(id);

        if (maybeGuild) {
            return maybeGuild;
        }

        const guild = new Guild();
        guild.id = id;

        const newGuild = await repo.persist(guild);

        return newGuild;
    }
}
