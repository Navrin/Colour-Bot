import { getConnectionManager } from 'typeorm';
import { Colour } from './model';
import { Guild } from '../guild/model';
import * as Discord from 'discord.js';

export const createNewColour = async (message: Discord.Message, name: string, roleID: string) => {
    const colourRepo = await getConnectionManager()
        .get()
        .getRepository(Colour);

    const guildRepo = await getConnectionManager()
        .get()
        .getRepository(Guild);

    const colour = new Colour();
    const guild = await guildRepo.findOneById(message.guild.id); 
    if (!guild) {
        message.channel.send(`Guild does not exist.`);
        return false;
    }

    colour.guild = guild;
    colour.name = name;
    colour.roleID = roleID;
    colour.users = [];

    // guild.colours.push(colour);

    await guildRepo.persist(guild);
    await colourRepo.persist(colour);

    return await colour;
};
