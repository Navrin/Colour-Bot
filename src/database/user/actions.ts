import * as Discord from 'discord.js';
import { User } from './model';
import { Connection } from 'typeorm';
import { Colour } from '../colour/model';

type CreateUserFunc =
    (discordUser: Discord.User,
        connection: Connection,
        colour: Colour) => Promise<User>;

const createUserIfNone: CreateUserFunc = async (discordUser, connection, colour) => {
    try {
        const userRepo = await connection.getRepository(User);
        const colourRepo = await connection.getRepository(Colour);

        const user = new User();
        user.id = parseInt(discordUser.id, 10);
        user.colour = colour;

        await colourRepo.persist(colour);
        await userRepo.persist(user);

        return user;
    } catch (e) {
        console.log(e)
        return;
    }
};

const setColourToUser = async (newColour: Colour, connection: Connection, user: User, message: Discord.Message) => {
    try {
        const userRepo = await connection.getRepository(User);
        const colourRepo = await connection.getRepository(Colour);
        const colourList = await colourRepo.find();

        if (user.colour != undefined) {
            const oldColour = message.guild.roles.get(user.colour.roleID);

            if (oldColour == undefined) {
                message.channel.send(`Error setting colour!`);
                return false;
            }
            await message.guild.member(message.author).removeRole(oldColour);
        }
        const userMember = message.guild.member(message.author.id);
        const possibleColours = colourList
            .map((colour) => userMember.roles.find('name', colour.name))
            .filter(id => id);
        
        await userMember.removeRoles(possibleColours);

        const updatedUser = await userRepo.persist(user);

        user.colour = newColour;

        await colourRepo.persist(newColour);
        await userRepo.persist(user);

        const nextColour = message.guild.roles.get(newColour.roleID.toString());
        if (nextColour == undefined) {
            message.channel.send(`Error getting colour!`);
            return false;
        }
        try {
            message.guild.member(message.author).addRole(nextColour);
            message.channel.send(`Your colour has been set!`);
        } catch (e) {
            message.channel.send(`Error setting colour: ${e}`)
        }

        return true;
    } catch (e) {
        message.channel.send(`error: ${e}`);
        return false;
    }

}

export {
    createUserIfNone,
    setColourToUser,
}
