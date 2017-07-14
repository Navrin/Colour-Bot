import { Controller } from './baseController';
import { Guild } from '../database/guild/model';
import { Connection, Repository, getConnectionManager } from 'typeorm';
import { Colour } from '../database/colour/model';
import { User } from '../database/user/model';

interface GuildCreatePayload {
    id: string;
}

interface GuildUpdatePayload {
    [key: string]: any;
    id?: string;
    colours?: Colour[] | Colour;
    users?: User[] | User;
    channel?: string;
    listmessage?: string;
}

export default
class GuildController implements Controller<Guild> {
    connection: Connection;
    guildRepo: Repository<Guild>;

    /**
     * Creates an instance of GuildController.
     * Controls guild DB interactions and updates.
     * @memberof GuildController
     */
    constructor() {
        this.connection = getConnectionManager().get();
        this.guildRepo = this.connection.getRepository(Guild);
    }    

    /**
     * Returns all the given guilds.
     * Helpful for superuser informations commands.
     * @returns 
     * @memberof GuildController
     */
    async index() {
        return this.guildRepo.find();
    }

    /**
     * Find a given guild via its name.
     * The name will be whatever name it was given 
     * @param {string} name 
     * @returns 
     * @memberof GuildController
     */
    async find(name: string) {
        const guild = await this.guildRepo
            .createQueryBuilder('guild')
            .where('guild.name LIKE :name', { name })
            .getOne();
        
        return guild;
    }

    /**
     * Find a given guild via it's discord ID snowflake.
     * 
     * @param {string} id 
     * @returns 
     * @memberof GuildController
     */
    async read(id: string) {
        const guild = await this.guildRepo.findOneById(id);

        return guild;
    }

    /**
     * Creates a new guild via an discord snowflake.
     * 
     * @param {GuildCreatePayload} payload 
     * @memberof GuildController
     */
    async create(payload: GuildCreatePayload) {
        const guild = new Guild();

        guild.id = payload.id;
        guild.colours = [];
        guild.users = [];

        const guildEntity = await this.guildRepo.persist(guild);
        return guildEntity;
    }

    /**
     * Iterates through the payload, merging the arrays and creating a new updated
     * guild, and persists it to the database.
     * 
     * @param {string} id 
     * @param {GuildUpdatePayload} payload 
     * @returns 
     * @memberof GuildController
     */
    async update(id: string, payload: GuildUpdatePayload) {
        const guild: ({ [key: string]: any; } & Guild) | undefined
            = await this.guildRepo.findOneById(id);

        if (!guild) {
            throw new TypeError('Guild does not exist!');
        }

        const mergedPayload = { ...guild };
        
        for (const [key, value] of Object.values(payload)) {
            if (Array.isArray(value)) {
                // merge the original guild value array with the payload array.
                mergedPayload[key] = [...mergedPayload[key], ...payload[key]];
            } else {
                mergedPayload[key] = payload[key];
            }
        }

        return await this.guildRepo.preload(guild);
    }

    /**
     * Find a guild based on it's discord snowflake and remove it.
     * 
     * @param {string} id 
     * @memberof GuildController
     */
    async delete(id: string) {
        const guild = await this.read(id);

        if (!guild) {
            throw new TypeError('Guild does not exist!');
        }

        try {
            await this.guildRepo.remove(guild);
            return true;
        } catch (e) {
            return false;
        }
    }
}
