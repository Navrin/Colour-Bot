import { getConnectionManager } from 'typeorm';
import { Guild } from './model';
import * as Discord from 'discord.js';

export const createGuildIfNone = async (message: Discord.Message) => {
    const guild = await makeGuildFromId(message.id);
    message.react('☑');
    return await guild;
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
    makeGuildFromId(guild.id);
};
