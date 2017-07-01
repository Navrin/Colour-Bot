import { getConnectionManager } from 'typeorm';
import { Guild } from './model';
import * as Discord from 'discord.js';

export const createGuildIfNone = async (message: Discord.Message) => {
    const guildRepo = await getConnectionManager()
        .get()
        .getRepository(Guild);

    const guild = new Guild();

    guild.id = message.guild.id;
    guild.colours = [];

    const guilder = await guildRepo.persist(guild);
    message.channel.send(`${message.guild.name} has been added to the database`);
    
    return await guild;
};
