import { Controller } from './baseController';
import { Colour } from '../database/colour/model';
import { Guild } from '../database/guild/model';
import { getConnectionManager, Connection, Repository } from 'typeorm';

interface ColourUpdateOptions {
    roleID?: string;
    name?: string;
}

interface ColourCreateOptions {
    name: string;
    roleID: string;
}

export default
class ColourController implements Controller<Colour> {
    guild: Guild;
    connection: Connection;
    guildRepo: Repository<Guild>;
    colourRepo: Repository<Colour>;

    /**
     * Creates an instance of ColourController.
     * Controls the colour creations and searches based on the parent gulid.
     * @param {Guild} guild 
     * @memberof ColourController
     */
    constructor(guild: Guild) {
        this.connection = getConnectionManager().get();
        this.guildRepo = this.connection.getRepository(Guild);
        this.colourRepo = this.connection.getRepository(Colour);
    }
    
    /**
     * List all colours for the current guild
     * 
     * @returns 
     * @memberof ColourController
     */
    async index() {
        const guildEntity = await this.guildRepo.findOne({
            alias: 'guild',
            id: this.guild.id,
            innerJoinAndSelect: {
                colours: 'guild.colours',
            },
        });

        if (guildEntity == null) {
            throw new TypeError('Guild does not exist!');
        }

        return guildEntity.colours;
    }
    
    /**
     * Get a colour via it's given ID.
     * 
     * @param {string} id 
     * @returns 
     * @memberof ColourController
     */
    async read(id: number) {
        const colour = await this.colourRepo.findOneById(id);
        return colour;
    }

    /**
     * Find a given colour based on its name.
     * Matches very loosely, will find the closest match.
     * 
     * @param {string} name 
     * @returns 
     * @memberof ColourController
     */
    async find(name: string) {
        const colour = await this.colourRepo
            .createQueryBuilder('colour')
            .where('colour.guild = :guild', { guild: this.guild.id })
            .andWhere('colour.name LIKE :colour', { colour: `%${name}%` })
            .getOne();
        
        return colour;
    }

    /**
     * Create a given colour based on it's payload.
     * 
     * @param {ColourCreateOptions} payload 
     * @returns 
     * @memberof ColourController
     */
    async create(payload: ColourCreateOptions) {
        const colour = new Colour();

        colour.roleID = payload.roleID;
        colour.name = payload.name;
        colour.guild = this.guild;
        colour.users = [];
        
        const colourEntity = await this.colourRepo.persist(colour);
        const updatedGuildEntity = await this.guildRepo.persist(this.guild);
        this.guild = updatedGuildEntity;

        return colourEntity;
    }

    /**
     * Finds a colour entity via the id, merges the details and updates
     * the entity in the schema.
     * 
     * @param {number} id 
     * @param {ColourUpdateOptions} details 
     * @returns 
     * @memberof ColourController
     */
    async update(id: number, details: ColourUpdateOptions) {
        const colour = await this.colourRepo.findOneById(id);

        if (colour == null) {
            throw new TypeError('Colour does not exist!');
        }

        const payload = {
            ...colour,
            ...details,
        };

        const updatedColour = await this.colourRepo.preload(payload);
        return updatedColour;
    }

    /**
     * Deletes a given colour via it's ID.
     * 
     * @param {string} id 
     * @returns 
     * @memberof ColourController
     */
    async delete(id: number) {
        const colour = await this.read(id);
        if (colour == null) {
            throw new TypeError('Colour does not exist!');
        }

        try {
            const success = await this.colourRepo.remove(colour);
            return true;
        } catch (e) {
            return false;
        }
    }
}
