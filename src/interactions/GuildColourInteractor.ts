import * as Discord from 'discord.js';
import { Connection, getConnectionManager, Repository } from 'typeorm';
import { Guild } from '../models/guild';
import GuildController from '../controllers/GuildController';
import ColourController from '../controllers/ColourController';
import { InteractionResponses } from './InteractorReponses';
import { Colour } from '../models/colour';

export 
enum GuildColourStatus {
    SUCCESS = 0,
    SUCCESS_UPDATE_LIST,
    FAILURE,
    FAILURE_UPDATE_LIST,
}

type GuildColourResponse<T = void> = InteractionResponses<GuildColourStatus, T>;

export default 
class GuildColourInteractor {
    guildRepo: Repository<Guild>;
    connection: Connection;
    guildController: GuildController;
    colourController: ColourController;
    guild: Guild;
    context: Discord.Message;
    discordGuild: Discord.Guild;



    /**
     * Creates an instance of GuildColourInteractor.
     * 
     * @param {Discord.Message} context 
     * @param {Guild} guild 
     * @memberof GuildColourInteractor
     */
    constructor(connection: Connection, context: Discord.Message, guild: Guild) {
        this.guild = guild;
        this.context = context;
        this.discordGuild = context.guild;
        this.connection = connection;
        this.guildRepo = this.connection.getRepository(Guild);
        this.guildController = new GuildController(connection);
        this.colourController = new ColourController(connection, this.guild);
    }
    
    /**
     * Creates a new colour role with the given name,
     * or updates the previously existing role.
     * 
     * @param {Discord.Role} role 
     * @memberof GuildColourInteractor
     */
    async createOrUpdateColour(
        role: Discord.Role, 
        name: string,
    ): Promise<GuildColourResponse<Colour>> {
        const existingColour = await this.colourController.find({ roleID: role.id });
        const colour = (existingColour)
            ? await this.colourController.update(existingColour.id, {
                    name,
            })
            : await this.colourController.create({
                name,
                roleID: role.id,
            });
        return {
            status: GuildColourStatus.SUCCESS_UPDATE_LIST,
            message: `Colour successfully ${(existingColour) ? 'updated' : 'created'}!`,
            data: colour,
            type: 'success',
        };
    }
    
    /**
     * Removes a colour and it's associated discord guild role.
     * 
     * @param {Colour} colour 
     * @returns {Promise<GuildColourResponse>} 
     * @memberof GuildColourInteractor
     */
    async removeColour(colour: Colour): Promise<GuildColourResponse> {
        const guildColourRole = await this.discordGuild.roles.get(colour.roleID);
        if (guildColourRole) {
            guildColourRole.delete();
        }
        const success = await this.colourController.delete(colour.id);
        if (success) {
            return {
                status: GuildColourStatus.SUCCESS_UPDATE_LIST,
                message: 'Colour successfully deleted',
                type: 'success',
            };
        }
        return {
            status: GuildColourStatus.FAILURE,
            message: 'Colour was not deleted!',
            type: 'failure',
        };
    }
}
