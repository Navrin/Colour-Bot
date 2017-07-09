import { getConnectionManager } from 'typeorm';
import { Guild } from './model';
import * as Discord from 'discord.js';

export const createGuildIfNone = async (message: Discord.Message) => {
    try {
        const guild = await makeGuildFromId(message.id);
        message.react('☑');
        return await guild;
    } catch (e) {
        message.channel.send('Woah. Error creating this guild, detonating the existing? guild.');
        const guildRepo = await getConnectionManager()
            .get()
            .getRepository(Guild);
        
        const maybeGuild = await guildRepo.findOneById(message.guild.id);
        
        if (maybeGuild) {
            await guildRepo.remove(maybeGuild);
        }

        return makeGuildFromId(message.guild.id);
    }

};

const makeGuildFromId = async (id: string) => {
    const guildRepo = await getConnectionManager()
        .get()
        .getRepository(Guild);

    const guild = new Guild();

    guild.id = id;
    guild.colours = [];

    const guilder = await guildRepo.persist(guild);
    return await guild;
};

export const listenForGuilds = async (guild: Discord.Guild) => {
    const maybeGuild = await getConnectionManager()
        .get()
        .getRepository(Guild)
        .findOneById(guild.id);
    
    if (maybeGuild === undefined) {
        makeGuildFromId(guild.id);
    }
};
