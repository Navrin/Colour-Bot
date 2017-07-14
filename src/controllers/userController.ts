import { Controller } from './baseController';
import { Connection, Repository, getConnectionManager } from 'typeorm';
import { User } from '../models/user';

export default
class UserController implements Controller<User> {
    connection: Connection;
    userRepo: Repository<User>;
    
    constructor() {
        this.connection = getConnectionManager().get();
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

    async find(id: string) {
        
    }
}

