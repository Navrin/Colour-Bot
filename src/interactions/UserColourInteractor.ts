import * as Discord from 'discord.js';
import { User } from '../models/user';
import { Connection, getConnectionManager, Repository, getConnection } from 'typeorm';
import { Guild } from '../models/guild';
import { Colour } from '../models/colour';
import { confirm } from '../confirmer';
import UserController from '../controllers/UserController';
import ColourController from '../controllers/ColourController';
import { InteractionResponses } from './InteractorReponses';
import * as _ from 'lodash';

export 
enum ColourStatusReturns {
    SUCCESS = 0,
    FAILURE,
    FAILURE_UPDATE_LIST,
}

export 
type ColourReturnMessage<T> = InteractionResponses<ColourStatusReturns, T>;

export default
class UserColourInteractor {
    connection: Connection;
    guildRepo: Repository<Guild>;
    userRepo: Repository<User>;
    colourController: ColourController;
    userController: UserController;
    discordGuild: Discord.Guild;
    discordUser: Discord.User;
    message: Discord.Message;
    guild: Guild;

    constructor(connection: Connection, context: Discord.Message, guild: Guild) {
        this.discordGuild = context.guild;
        this.discordUser = context.author;
        this.message = context;
        this.connection = connection;
        this.userController = new UserController(connection);
        this.guild = guild;        
        this.colourController = new ColourController(connection, this.guild);
        this.userRepo = this.connection.getRepository(User);
        this.guildRepo = this.connection.getRepository(Guild);
        return this;
    }

    /**
     * Adds a colour to the given user.
     * Check if a user already has colours the bot can use,
     * if so, delete them.
     * 
     * Returns an object that describes the result of the operation.
     * 
     * @param {Colour} colour 
     * @returns {(Promise<ColourReturnMessages>)} 
     * @memberof UserColourInteractor
     */
    async addColour(colour: Colour): Promise<ColourReturnMessage<void>> {
        const allColours = await this.colourController.index();
        const colourRoleIds = allColours.map(c => c.roleID);

        const userWithGuildContext =
            this
                .discordGuild
                .member(this.discordUser);
        
        const allUserGuildColours = this.discordGuild.roles
            .filterArray(role => 
                role.id !== colour.roleID 
                && userWithGuildContext.roles.exists('id', role.id)
                && colourRoleIds.includes(role.id));

        await userWithGuildContext.removeRoles(allUserGuildColours);

        const discordGuildColour = this.discordGuild.roles.get(colour.roleID);

        if (discordGuildColour === undefined) {
            this.colourController.delete(colour.id);
            return {
                status: ColourStatusReturns.FAILURE_UPDATE_LIST,
                message: 'Colour was removed from the guild, updating list...',
                type: 'failure',
            };
        }

        try {
            await userWithGuildContext.addRole(discordGuildColour);
            return {
                status: ColourStatusReturns.SUCCESS,
                message: 'Your colour has been set!',
                type: 'success',
            };
        } catch (e) {
            return {
                status: ColourStatusReturns.FAILURE,
                message: `Failure setting colour due to: ${e}`,
                type: 'failure',
            };
        }
    }

    /**
     * Removes a current colour from the user.
     * If the user has no colour, 
     * 
     * @memberof UserColourInteractor
     */
    async removeColourFromUser(): Promise<ColourReturnMessage<Colour>> {
        const allColours = await this.colourController.index();
        const colourRoleIds = allColours.map(c => c.roleID);

        const discordColours = this.discordGuild.roles
            .filterArray(role => colourRoleIds.includes(role.id));
        
        const userWithGuildContext = await this.discordGuild.member(this.discordUser);

        await userWithGuildContext.removeRoles(discordColours);

        return {
            status: ColourStatusReturns.SUCCESS,
            message: 'Colour deleted!',
            type: 'success',
        };
    }
}
