import * as Discord from 'discord.js';
import { User } from './model';
import { Connection } from 'typeorm';
import { Colour } from '../colour/model';
import { Guild } from '../guild/model';
import { dispatch } from '../../dispatch';

type CreateUserFunc = (
        discordUser: Discord.User,
        guild: Guild,
        connection: Connection,
        colour: Colour,
    ) => Promise<User | undefined>;

const createUserIfNone: CreateUserFunc = async (discordUser, guild, connection, colour) => {
    try {
        const userRepo = await connection.getRepository(User);
        const colourRepo = await connection.getRepository(Colour);
        const guildRepo = await connection.getRepository(Guild);

        const user = new User();
        user.id = discordUser.id;
        user.colour = colour;
        user.guild = guild;

        await guildRepo.persist(guild);
        await colourRepo.persist(colour);
        await userRepo.persist(user);

        return user;
    } catch (e) {
        console.log(e);
        return;
    }
};

const findUser = async (user: string, guild: Guild, connection: Connection) => {
    const guildRepo = await connection.getRepository(Guild);
    const userRepo = await connection.getRepository(User);
    const colourRepo = await connection.getRepository(Colour);

    // const userEntity = userRepo
    //     .createQueryBuilder('user')
    //     .innerJoin('user.guild', 'guild', 'user.guild = guild.id')
    //     .innerJoin('user.colour', 'colour', 'user.colour = colour.id')
    //     .where('user.id = :userid', { userid: user })
    //     .getOne();
    
    const userEntity = userRepo
        .findOne({
            alias: 'user',
            id: user,
            innerJoinAndSelect: {
                colour: 'user.colour',
            },
        });

    return userEntity;
};

export {
    createUserIfNone,
    findUser,
};
