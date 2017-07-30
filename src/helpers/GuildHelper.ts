import { Connection, getConnectionManager } from 'typeorm';
import GuildController from '../controllers/GuildController';
import { Guild, defaultGuildSettings } from '../models/guild';



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
            await repo.findOneById(id, {
                alias: 'guild',
                innerJoinAndSelect: {
                    colours: 'guild.colours',
                },
            });

        if (maybeGuild) {
            if (maybeGuild.settings === undefined) {
                return await this.controller.update(maybeGuild.id, {
                    settings: defaultGuildSettings,
                });
            }
            return maybeGuild;
        }

        const guild = new Guild();
        guild.id = id;
        guild.settings = defaultGuildSettings;
        guild.colours = [];

        const newGuild = await repo.persist(guild);

        return newGuild;
    }
}
