import UserController from '../controllers/UserController';
import { Guild } from '../models/guild';

export default 
class UserHelper {
    controller: UserController;

    /**
     * Creates an instance of UserHelper.
     * @param {UserController} controller 
     * @memberof UserHelper
     */
    constructor(controller: UserController) {
        this.controller = controller;
    }

    /**
     * Finds an existing user from and ID.
     * If it does not exist, create a new user.
     * 
     * @param {string} id 
     * @memberof UserHelper
     */
    async findOrCreateUser(id: string, guild?: Guild) {
        const existingUser = await this.controller.find(id, (guild) ? guild.id : undefined);
        if (existingUser) {
            return existingUser;
        }

        const newUser = await this.controller.create({
            id,
            guild,
        });
       return newUser;
    }
}
