import '../models/__init';
import { Controller } from './BaseController';
import { Connection, Repository, getConnectionManager } from 'typeorm';
import { User } from '../models/user';
import { Colour } from '../models/colour';
import { Guild } from '../models/guild';

interface UserCreatePayload {
    id: string;
    colour?: Colour;
    guild?: Guild;
}

interface UserUpdatePayload {
    colours?: Colour[] | Colour;
    guilds?: Guild[] | Guild;
}


export default 
class UserController implements Controller<User> {
    connection: Connection;
    userRepo: Repository<User>;

    constructor(connection: Connection) {
        this.connection = connection;
        this.userRepo = this.connection.getRepository(User);
    }

    /**
     * Returns all users without their given relations.
     * 
     * @returns 
     * @memberof UserController
     */
    async index() {
        const users = this.userRepo.find();
        return users;
    }

    /**
     * Find a user via it's id.
     * If a guild is given, only load its entities in relation to the guild.
     * Else, load all it's relations (intensive)
     * Very intensive, so only use it when you need the unknown colours. 
     * 
     * @param {string} id 
     * @param {string} guild 
     * @returns 
     * @memberof UserController
     */
    async find(id: string, guild: string | undefined) {
        if (guild === undefined) {
            return this.userRepo.findOne({
                id,
                alias: 'user',
                innerJoinAndSelect: {
                    // guilds: 'user.guilds',
                    requests: 'user.requests',
                },
            });
        }

        const user = await this.userRepo
            .createQueryBuilder('user')
            .where('user.id = :id', { id })
            // .leftJoinAndSelect('user.guilds', 'guilds', 'guilds.id = :guild')
            .innerJoinAndSelect('user.requests', 'requests', 'requests.guild = :guild')
            .addParameters({ guild })
            .getOne();
        

        return user;
    }


    /**
     * Get a given user object without it's relationships.
     * 
     * @param {string} id 
     * @returns 
     * @memberof UserController
     */
    async read(id: string) {
        const user = await this.userRepo.findOneById(id);
        return user;
    }

    /**
     * Creates a new user with optional guild and colour arguments.
     * 
     * @param {UserCreatePayload} payload 
     * @returns 
     * @memberof UserController
     */
    async create(payload: UserCreatePayload) {
        const user = new User();
        
        user.id = payload.id,
        user.guilds = (payload.guild) ? [payload.guild] : [];
        user.requests = [];

        return await this.userRepo.persist(user);
    }

    /**
     * Updates a given entitiy based on the ID with the payload.
     * 
     * @param {string} id 
     * @param {UserUpdatePayload} payload 
     * @memberof UserController
     */
    async update(id: string, payload: UserUpdatePayload) {
        const user: (User & { [key: string]: any }) | undefined
             = await this.userRepo.findOneById(id);

        if (user === undefined) {
            throw new TypeError('User does not exist!');
        }


        for (const [key, value] of Object.entries(payload)) {
            if (Array.isArray(value)) {
                // merge the original guild value array with the payload array.
                user[key] = [...user[key], ...value];
            } else {
                user[key] = value;
            }
        }

        const updatedUser = await this.userRepo.persist(user);
        return updatedUser;
    }

    /**
     * Delete a given entitiy based on the ID.
     * 
     * @param {string} id 
     * @memberof UserController
     */
    async delete(id: string) {
        const user = await this.userRepo.findOneById(id);
        
        if (user === undefined) {
            throw new TypeError('User does not exist!');
        }

        try {
            await this.userRepo.remove(user);
            return true;
        } catch (e) {
            return false;
        }
    }
}

const mergeArrays = <T, P>(arr: T | T[] | undefined, merger: P[]) => {
    if (arr == null) {
        return merger;
    }

    return Array.isArray(arr) ? [...merger, ...arr] : [...merger, arr];
};
