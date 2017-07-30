import { ColourRequest } from '../models/colourRequest';
import { Connection, Repository } from 'typeorm';
import { oneLineTrim } from 'common-tags';
import * as Discord from 'discord.js';
import { InteractionResponses } from './InteractorReponses';
import { Guild } from '../models/guild';
import RequestController from '../controllers/RequestController';
import ColourController from '../controllers/ColourController';
import UserController from '../controllers/UserController';
import UserHelper from '../helpers/UserHelper';

const _cd = require('color-difference');
const compareColours = (origin: string, target: string): number => {
    return _cd.compare(origin, target);
};

export 
enum RequestColourStatus {
    SUCCESS = 0,
    SUCCESS_UPDATE_LIST,
    FAILURE,
    FAILURE_UPDATE_LIST,
}

type GuildRequestReponse<T = void> = InteractionResponses<RequestColourStatus, T>;

export default
class GuildRequestInteractor {
    userHelper: UserHelper;
    userController: UserController;
    colourController: ColourController;
    discordGuild: Discord.Guild;
    requestController: RequestController;
    requestRepo: Repository<ColourRequest>;
    guildRepo: Repository<Guild>;
    guild: Guild;
    context: Discord.Message;
    connection: Connection;

    /**
     * Creates an instance of GuildRequestController.
     * @param {Connection} connection 
     * @param {Discord.Message} context 
     * @param {Guild} guild 
     * @memberof GuildRequestController
     */
    constructor(connection: Connection, context: Discord.Message, guild: Guild) {
        this.connection = connection;
        this.context = context;
        this.guild = guild;
        this.discordGuild = context.guild;
        this.guildRepo = this.connection.getRepository(Guild);
        this.requestRepo = this.connection.getRepository(ColourRequest);
        this.colourController = new ColourController(connection, guild);
        this.requestController = new RequestController(connection, guild);
        this.userController = new UserController(connection);
        this.userHelper = new UserHelper(this.userController);
    }

    /**
     * Creates a new colour request for the guild.
     * If the guild already has a colour close to the request,
     * deny the request.
     * 
     * @param {Discord.User} user 
     * @param {string} colour 
     * @memberof GuildRequestController
     */
    async createNewRequest(
        user: Discord.User,
        colour: string,
    ): Promise<GuildRequestReponse<ColourRequest>> {
        const colourEntities = await this.colourController.index();
        const entityRoles = colourEntities.map(colour => colour.roleID);

        const colourRoles = this.discordGuild.roles
            .filter(role => entityRoles.includes(role.id));

        const existingColours = colourEntities
            .map(colour => ({ 
                name: colour.name,
                role: colourRoles.get(colour.roleID),
            }))
            .filter(
                entity => entity.role !== undefined 
                && this.guild.settings
                && compareColours(colour, entity.role.hexColor) <= this.guild.settings.colourDelta,
            );
        
        if (existingColours.length > 0) {
            const existing = existingColours[0];
            return {
                status: RequestColourStatus.FAILURE,
                message: oneLineTrim`Colour ${colour} is too close to an 
                    existing colour (${existing.name}, 
                    ${(existing.role && existing.role.hexColor) || ''})`,
                type: 'failure',
            };
        }

        const userEntity = await this.userHelper.findOrCreateUser(user.id); 
        const request = await this.requestController.create({ colour, user: userEntity });

        return {
            status: RequestColourStatus.SUCCESS,
            message: 'Success!',
            type: 'success',
            data: request,
        };
    }

    async cancelRequest(user: Discord.User) {
        const userEntity = this.userHelper.findOrCreateUser(user.id, this.guild);
        
    }
}
