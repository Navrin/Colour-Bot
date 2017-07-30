import { Guild } from '../models/guild';
import { Connection, Repository } from 'typeorm';
import { Controller } from './BaseController';
import { ColourRequest } from '../models/colourRequest';
import { User } from '../models/user';

interface RequestPayload { 
    colour: string;
    user: User;
}

export default
class RequestController implements Controller<ColourRequest> {
    connection: Connection;
    requestRepo: Repository<ColourRequest>;
    guildRepo: Repository<Guild>;
    userRepo: Repository<User>;
    guild: Guild;

    /**
     * Creates an instance of RequestController.
     * @param {Connection} connection 
     * @memberof RequestController
     */
    constructor(connection: Connection, guild: Guild) {
        this.connection = connection;
        this.requestRepo = connection.getRepository(ColourRequest);
        this.guildRepo = connection.getRepository(Guild);
        this.userRepo = connection.getRepository(User);
        this.guild = guild;
    }

    /**
     * Returns all the current requests a guild has.
     * 
     * @returns 
     * @memberof RequestController
     */
    async index() {
        const requests = await this.requestRepo
            .createQueryBuilder('requests')
            .innerJoinAndSelect('requests.guild', 'guilds')
            .where('guilds.id = :guild', { guild: this.guild.id })
            .innerJoinAndSelect('requests.user', 'users')
            .getMany();

        return requests;
    }

    /**
     * Finds a request without scoping to any guilds.
     * 
     * @param {number} id 
     * @memberof RequestController
     */
    async find(id: number) {
        return this.requestRepo.findOneById(id);
    }

    /**
     * Get a request scoped to the discord guild.
     * 
     * @param {number} id 
     * @returns 
     * @memberof RequestController
     */
    async read(id: number) {
        const entities = await this.guildRepo
            .createQueryBuilder('guild')
            .where('guild.id = :guild', { guild: this.guild })
            .innerJoinAndSelect('guild.requests', 'request')
            .andWhere('request.id = :id', { id })
            .getOne();
        
        if (entities) {
            return entities.requests[0];
        }

        return entities;
    }

    /**
     * Creates a new request and returns it
     * 
     * @param {{ colour: string }} { colour } 
     * @memberof RequestController
     */
    async create({ colour, user }: RequestPayload) {
        const request = new ColourRequest();

        request.colour = colour;
        request.guild = this.guild;
        request.user = user;

        user.requests.push(request);

        this.userRepo.persist(user);
        return await this.requestRepo.persist(request);
    }

    /**
     * Updates the colour on a request object.
     * 
     * @param {{ colour: string }} { colour } 
     * @memberof RequestController
     */
    async update(id: number, { colour }: { colour: string }) {
        const request = await this.requestRepo.findOneById(id);
        if (request === undefined) {
            throw new TypeError('Request object does not exist!');
        }

        request.colour = colour;

        return await this.requestRepo.persist(request);
    }

    /**
     * Deletes a request ID.
     * 
     * @param {number} id 
     * @returns 
     * @memberof RequestController
     */
    async delete(id: number) {
        const request = await this.requestRepo.findOneById(id);
        if (request === undefined) {
            throw new TypeError('Request object does not exist!');
        }

        try {
            await this.requestRepo.remove(request);
            return true;
        } catch (e) {
            return false;
        }
    }
}
