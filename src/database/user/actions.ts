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
    ) => Promise<User>;

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

    const userEntity = userRepo
        .createQueryBuilder('user')
        .innerJoin('user.guild', 'guild', 'user.guild = guild.id')
        .where('user.id = :userid', { userid: user })
        .getOne();

    return userEntity;
};


const setColourToUser = async (
        newColour: Colour, 
        connection: Connection, 
        user: User, 
        guild: Guild, 
        message: Discord.Message,
    ) => {
    try {
        const userRepo = await connection.getRepository(User);
        const colourRepo = await connection.getRepository(Colour);
        const guildRepo = await connection.getRepository(Guild);

        const colourList = await colourRepo.find();

        if (user.colour !== undefined) {
            const oldColour = message.guild.roles.get(user.colour.roleID);

            if (oldColour === undefined) {
                dispatch(message, `Error setting colour!`);
                return false;
            }
            await message.guild.member(message.author).removeRole(oldColour);
        }
        const userMember = message.guild.member(message.author.id);
        const possibleColours = colourList
            .map(colour => userMember.roles.find('name', colour.name))
            .filter(id => id);
        
        await userMember.removeRoles(possibleColours);

        const updatedUser = await userRepo.persist(user);

        user.colour = newColour;

        await colourRepo.persist(newColour);
        await userRepo.persist(user);
        await guildRepo.persist(guild);

        const nextColour = message.guild.roles.get(newColour.roleID.toString());
        if (nextColour === undefined) {
            dispatch(message, `Error getting colour!`);
            return false;
        }
        try {
            message.guild.member(message.author).addRole(nextColour);
            dispatch(message, `Your colour has been set!`);
        } catch (e) {
            dispatch(message, `Error setting colour: ${e}`);
        }

        return true;
    } catch (e) {
        dispatch(message, `error: ${e}`);
        return false;
    }
};

export {
    createUserIfNone,
    setColourToUser,
    findUser,
};
