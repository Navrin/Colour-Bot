import * as path from 'path';
import * as fs from 'mz/fs';
import * as yaml from 'js-yaml';
import * as Discord from 'discord.js';
import { getConnectionManager, Connection } from 'typeorm';
import { CommandFunction, CommandDefinition, RoleTypes } from 'simple-discordjs';
import { stripIndents, oneLineTrim } from 'common-tags';
import { dispatch, confirm } from './confirmer';
import UserController from './controllers/UserController';
import GuildController from './controllers/GuildController';
import GuildHelper from './helpers/GuildHelper';
import ColourController from './controllers/ColourController';
import UserHelper from './helpers/UserHelper';
import UserColourInteractor, { ColourStatusReturns } from './interactions/UserColourInteractor';
import GuildColourInteractor, { GuildColourStatus } from './interactions/GuildColourInteractor';
import { Guild } from './models/guild';
import { Colour } from './models/colour';
import { createShot } from './utils/webshot';
import { JSDOM } from 'jsdom';
import listTemplate, { ListColour } from './listTemplate';
import { RequestCommands } from './RequestCommands';
import escapeStringRegexp = require('escape-string-regexp');
const sleep = (delay: number) => new Promise((res, rej) => {
    setTimeout(() => res(), delay);
});


interface ColourList {
    [key: string]: number;
}

type WithSilent = (silent: boolean) => Promise<boolean>;

const standardColours: ColourList = {
    red: 0xFF0000,
    orange: 0xFF7F00,
    yellow: 0xFFFF00,
    green: 0x00FF00,
    blue: 0x0000FF,
    indigo: 0x4B0082,
    violet: 0x9400D3,
    white: 0xFFFFFF,
};

export default class Colourizer {
    connection = getConnectionManager().get();
    userController = new UserController(this.connection);
    userHelper = new UserHelper(this.userController);
    guildController = new GuildController(this.connection);
    guildHelper = new GuildHelper(this.connection);
    requests = new RequestCommands(this.connection, this);

    /************
     * COMMANDS *
     ************/

    public getSetCommand: () => CommandDefinition = () => {
        return {
            authentication: RoleTypes.ADMIN,
            command: {
                action: this.setColour,
                names: ['setcolor', 'setcolour'],
                parameters: '{{colour}} {{role}}',
            },
            description: {
                message: stripIndents`Sets a role colour to be registered.
                If no roles are mentions, perform a search for a role by name,
                and if more than one role is found, specify role name further.`,
                example: stripIndents`{{{prefix}}}setcolour green @role
                 {{{prefix}}}setcolour green role_name_here`,
            },
        };
    }

    public getColourCommand: () => CommandDefinition = () => {
        return {
            command: {
                action: this.getColour,
                names: ['colour', 'addcolour', 'getcolour', 'color', 'addcolor', 'getcolor', ''],
                parameters: '{{colour}}',
            },
            custom: {
                locked: true,
            },
            description: {
                message: 'Set a colour role to yourself',
                example: '{{{prefix}}}getcolour green',
            },
        };
    }

    /**
     * A quick hack to allow for pre-fix less colour commands.
     * instead of c.getcolour green
     * users can type 
     * green
     * into a set channel
     * @memberof Colourizer
     */
    public getDirtyColourCommand: (prefix: string) => CommandDefinition = (prefix: string) => {
        return {
            command: {
                action: async (message, options, params, client, self) => {
                    const res = new RegExp(`(.\s?)+`).exec(message.content);
                    if (res && !message.content.toLowerCase().startsWith(prefix)) {
                        await this
                            .getColour(
                            message,
                            options,
                            {
                                ...params,
                                named: {
                                    colour: res[0],
                                },
                            },
                            client,
                            self,
                        );
                    }
                    return false;
                },
                names: ['colourdirty'],
                noPrefix: true,
                pattern: /(.\s?)+/,
            },
            custom: {
                locked: true,
            },
        };
    }

    public guardChannel: (prefix: string) => CommandDefinition = prefix => (
        {
            command: {
                action: async (message, op, pr, cl, self) => {
                    const regex =
                        new RegExp(`${escapeStringRegexp(prefix)}([\\S]+)(\\s.+)?`);
                    const match = regex.exec(message.content);
                    if (match && match[1]) {
                        if (self.checkCommandExists(match[1])) {
                            return true;
                        }
                        confirm(
                            message,
                            'failure',
                            'Command does not exist!',
                            { delay: 1500, delete: true },
                        );
                    }
                    return true;
                },
                names: ['clean'],
                noPrefix: true,
                pattern: new RegExp(`${escapeStringRegexp(prefix)}.+`),
            },
            custom: {
                locked: true,
            },
        })

    public getQuickColourCommand: () => CommandDefinition = () => {
        return {
            command: {
                action: this.quickCreateColour,
                names: ['quickcolour', 'makecolour', 'quickcolor', 'makecolor'],
                parameters: '{{colourName}} {{colourCode}}',
            },
            authentication: RoleTypes.ADMIN,
            description: {
                message: 'Generate a new colour quickly with a hex code',
                example: '{{{prefix}}}quickcolour red FF0000',
            },
        };
    }

    public getListCommand: () => CommandDefinition = () => {
        return {
            command: {
                action: this.listColours,
                names: ['allcolours', 'colours', 'allcolors', 'colors'],
            },
            description: {
                message: oneLineTrim`Creates a singleton message that keeps a list of all colours, 
                                     automatically updated`,
                example: '{{{prefix}}}colours',
            },
            authentication: RoleTypes.ADMIN,
            custom: {
                locked: true,
            },
        };
    }

    public getGenerateColours: () => CommandDefinition = () => {
        return {
            command: {
                action: this.generateStandardColours,
                names: ['generate', 'generate_colours'],
            },
            authentication: RoleTypes.ADMIN,
            description: {
                message: 'Generates a set of starter colours. (ADMIN ONLY)',
                example: '{{{prefix}}}generate',
            },
        };
    }

    public getDeleteColour: () => CommandDefinition = () => {
        return {
            command: {
                action: this.deleteColourEntity,
                names: ['delete', 'remove', 'purge'],
                parameters: '{{colourName}}',
            },
            authentication: RoleTypes.ADMIN,
            description: {
                message: 'Delete a role from the schema. (ADMIN ONLY)',
                example: '{{{prefix}}}delete purple',
            },
        };
    }

    public getMessageCommand: () => CommandDefinition = () => (
        {
            command: {
                action: this.createChannelMessage,
                names: ['message', 'pin', 'msg'],
            },
            authentication: RoleTypes.ADMIN,
            description: {
                message: 'Create a message for the colour channel (ADMIN ONLY)',
                example: '{{{prefix}}}msg',
            },
        }
    )

    public getInitiateCommand: () => CommandDefinition = () => (
        {
            command: {
                action: this.initiateNewServer,
                names: ['init', 'initiate', 'newserver'],
            },
            authentication: RoleTypes.OWNER,
            description: {
                message: 'Initiate a new server, do this in a private channel! (OWNER ONLY)',
                example: '{{{prefix}}}init',
            },
        }
    )

    public getCycleExistingCommand: () => CommandDefinition = () => (
        {
            command: {
                action: this.cycleExistingRoles,
                names: ['cycle_existing', 'cycle'],
            },
            authentication: RoleTypes.ADMIN,
            description: {
                message: 'Cycles the existing server roles as an interactive prompt.',
                example: '{{{prefix}}}cycle',
            },
        }
    )

    /*********************
     * COMMAND FUNCTIONS *
     *********************/

    /**
     * Creates a help message in the colour channel.
     * // TODO: Allow for custom messages possibly?
     * // TODO: Track help messages like the list, to delete automatically when updated
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private createChannelMessage: CommandFunction = async (
        message,
        opts,
        params,
        client,
        commander,
    ) => {
        const guildEntity = await this.guildHelper.findOrCreateGuild(message.guild.id);

        if (guildEntity && guildEntity.channel) {
            const channel = <Discord.TextChannel>message
                .guild
                .channels
                .find('id', guildEntity.channel);

            if (channel instanceof Discord.TextChannel) {
                if (guildEntity.helpmessage) {
                    channel.fetchMessage(guildEntity.helpmessage)
                        .then((message) => {
                            if (message) {
                                message.delete();
                            }
                        })
                        .catch((err: any) => {
                            this.guildController.update(guildEntity.id, {
                                helpmessage: undefined,
                            });
                        });
                }


                const helpMessage =
                    <Discord.Message>await channel.send(
                        stripIndents`
                        Request a colour by typing out one of the following colours below. 

                        __**Only type just the colour, no messages before or after it.**__

                        If you would like to request a custom colour,
                        type \`${commander.defaultPrefix.str}request colour\`
                        
                        example: \`${commander.defaultPrefix.str}request ff0000\`.

                        Depending on the server settings this colour will automatically be added,
                        or subject to admin approval.

                        __Don't try to talk in this channel__
                        messages are deleted automatically.`);

                await this.guildController.update(guildEntity.id, {
                    helpmessage: helpMessage.id,
                });

                confirm(message, 'success');
                return true;
            }

            confirm(message, 'failure', 'Channel not found!');
            return false;
        }

        confirm(message, 'failure', 'Set a colour channel first!');
        return false;
    }


    /**
     * Create a list of colours currently in the guild schema
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private listColours: CommandFunction = async (message) => {
        try {
            this.updateOrListColours(message, true);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Determines if the colour list should be created, 
     * or update the existing one (delete and repost list)
     * 
     * @private
     * @returns 
     * @memberof Colourizer
     */
    public async updateOrListColours(message: Discord.Message, destroyMessage?: boolean) {
        const errorHelper = (error: string, message: Discord.Message, destroyMessage?: boolean) => {
            (destroyMessage)
                ? confirm(message, 'failure', error, { delete: true, delay: 5000 })
                : message.channel.send(error).then((msg: Discord.Message) => msg.delete());
            return;
        };


        const guildEntity = await this.guildHelper.findOrCreateGuild(message.guild.id);
        if (guildEntity.channel === undefined) {
            const error = 'Attempted to create a colour list, but no colour channel is set!';
            return errorHelper(error, message, destroyMessage);
        }

        const channel = <Discord.TextChannel>message
            .guild
            .channels
            .get(guildEntity.channel);

        if (channel === undefined) {
            const error = 'Current colour channel could not be found! (deleted?)';
            return errorHelper(error, message, destroyMessage);
        }

        if (guildEntity.listmessage) {
            try {
                const previous = await channel.fetchMessage(guildEntity.listmessage);
                if (previous) {
                    previous.delete();
                    this.guildController.update(guildEntity.id, {
                        listmessage: undefined,
                    });
                }
            } catch (e) {
                // message no real;
                this.guildController.update(guildEntity.id, {
                    listmessage: undefined,
                });
            }
        } else {
            message.channel
                .send('Creating a new colour list!')
                .then((msg: Discord.Message) => msg.delete(5000));
        }

        await this.syncColourList(channel, guildEntity);
        if (destroyMessage) {
            confirm(message, 'success');
        }
    }

    private async syncColourList(
        channel: Discord.TextChannel,
        guild: Guild,
    ) {
        const colourController = await new ColourController(this.connection, guild);
        const results = await colourController.index();


        const colours = results
            .map((colour): ListColour | undefined => {
                const roleColour = channel.guild.roles.get(colour.roleID);
                if (roleColour === undefined) {
                    return;
                }

                return {
                    name: colour.name,
                    hexColour: roleColour.hexColor,
                };
            });
        // dunno, typescript doesn't want to accept my filter.
        const coloursFiltered = <ListColour[]>colours.filter(value => value !== undefined);

        const dom = listTemplate(coloursFiltered);

        const img = 'list.png';
        await createShot(
            dom,
            img,
            {
                siteType: 'html',
                windowSize: {
                    height: `${results.length * 40}`,
                    width: '2500',
                },
                shotSize: {
                    height: 'all',
                    width: 'all',
                },
            });

        const newMsg = <Discord.Message>await channel.send({ file: img });

        this.guildController.update(guild.id, {
            listmessage: newMsg.id,
        });
        return true;
    }

    /**
     * Finds a colour from a command schema such as 
     * {{ colour }}
     * and adds it to the user.
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private getColour: CommandFunction = async (
        message,
        options,
        parameters: { array: string[], named: { colour: string } },
        client,
        self,
        silent: boolean = false,
    ) => {
        const { author, guild } = message;

        const guildEntity = await this.guildHelper.findOrCreateGuild(guild.id);
        const colourController = await new ColourController(this.connection, guildEntity);

        const colour = await colourController.find({
            name: parameters.named.colour,
        });

        if (colour === undefined) {
            confirm(message, 'failure', 'Colour was not found, check spelling!');
            return false;
        }

        // const userEntity = await this.userHelper.findOrCreateUser(author.id, guildEntity);
        // const userEntityWithRelations =
        //     await this.userController.find(userEntity.id, guildEntity.id);
        const fullGuild = await this.guildController.read(guild.id, true);

        if (fullGuild === undefined) {
            throw new Error('Loading the same guild returned undefined, database corruption?');
        }

        const colourInteractor = new UserColourInteractor(this.connection, message, fullGuild);
        
        const response = await colourInteractor.addColour(colour);
        if (response.status === ColourStatusReturns.FAILURE_UPDATE_LIST) {
            this.updateOrListColours(message);
        }

        confirm(message, response.type, response.message);
    }

    /**
     * Sets a colour to the guild schema, only to be used by admins | mods
     * c.setcolour {{name}} {{green}}
     * will add the colour to the schema to be synced into the guild schema.
     * 
     * **Colours will automatically be synced on a change, so old roles will
     * be sycned properly, making it easier to migrate**
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private setColour: CommandFunction = async (
        message,
        options,
        parameters: { array: string[], named: { colour: string, role: string } },
    ) => {
        const { guild } = message;
        const guildEntity = await this.guildHelper.findOrCreateGuild(guild.id);

        const guildInteractor =
            await new GuildColourInteractor(this.connection, message, guildEntity);

        const roles = await this.findRole(message, parameters.named.role);
        if (roles === undefined) {
            confirm(message, 'failure', 'No roles found.');
            return;
        } else if (roles instanceof Discord.Collection && roles.size > 1) {
            const warning = stripIndents`
                Multiple roles found.
                ${roles
                    .map(role => `Name -> ${role.name.replace('@', '')}`)
                    .join('\n')}
            `;

            confirm(message, 'failure', warning, { delete: true, delay: 10000 });
            return;
        }

        const singularRole = (roles instanceof Discord.Collection) ? roles.first() : roles;

        const result =
            await guildInteractor.createOrUpdateColour(singularRole, parameters.named.colour);
        switch (result.status) {
            case GuildColourStatus.FAILURE_UPDATE_LIST:
            case GuildColourStatus.SUCCESS_UPDATE_LIST:
                this.updateOrListColours(message);
                break;
        }

        confirm(message, result.type, result.message);

    }

    /**
     * Finds a role from a search instead of mentioning the colour role itself.
     * Names must be UNIQUE.
     * 
     * @private
     * @param {Discord.Message} message 
     * @param {string} role 
     * @returns {(Promise<string | false>)} 
     * @memberof Colourizer
     */
    private async findRole(message: Discord.Message, role: string) {
        const roleKey = message.mentions.roles.first();

        if (roleKey) {
            return roleKey;
        }

        const search = message.guild.roles.filter(roleObject => roleObject.name.includes(role));

        return search;
    }

    /**
     * Creates a standard set of colours for demonstration and quick use.
     * Current just generates the standard 7 rainbow colours.
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private generateStandardColours: CommandFunction = async (message) => {
        const { guild } = message;
        const guildEntity = await this.guildHelper.findOrCreateGuild(guild.id);
        const guildInteractor =
            await new GuildColourInteractor(this.connection, message, guildEntity);

        for (const [colourName, colourCode] of Object.entries(standardColours)) {
            const oldRole = await guild.roles.find('name', `colour-${colourName}`);
            const role = (oldRole)
                ? oldRole
                : await guild.createRole({
                    name: `colour-${colourName}`,
                    color: colourCode,
                });

            if (!role) {
                continue;
            }

            const { type, data } = await guildInteractor.createOrUpdateColour(role, colourName);
            if (type === 'failure') {
                continue;
            }

        }

        this.updateOrListColours(message);
        return true;
    }

    /**
     * Quick utility method for mods to create a new colour role quickly.
     * c.quickcolour {{name}} {{colour_code}}
     * // TODO allow colour code to accept a #
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private quickCreateColour: CommandFunction = async (message, options, params: {
        array: string[],
        named: {
            colourName: string,
            colourCode: string,
        },
    }) => {
        const { colourName, colourCode } = params.named;
        const colour = /(?:#)?[0-9a-f]{6}/gmi.exec(colourCode);
        const guildEntity = await this.guildHelper.findOrCreateGuild(message.guild.id);
        const guildColourInteractor =
            await new GuildColourInteractor(this.connection, message, guildEntity);

        if (!colour) {
            await confirm(message, 'failure', 'No colour was specified');
            return false;
        }

        const colourMatch = colour[0];

        const colourRole =
            await message.guild.createRole({
                name: colourName,
                color: parseInt(colourMatch.replace('#', ''), 16),
            });

        const result = await guildColourInteractor.createOrUpdateColour(colourRole, colourName);

        switch (result.status) {
            case GuildColourStatus.FAILURE_UPDATE_LIST:
            case GuildColourStatus.SUCCESS_UPDATE_LIST:
                this.updateOrListColours(message);
                break;
        }

        confirm(message, result.type, result.message);

        return true;
    }

    /**
     * Deletes a colour from the db and the role, if it exists
     * For admins only.
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private deleteColourEntity: CommandFunction = async (message, ots, params: {
        array: string[],
        named: {
            colourName: string,
        },
    }) => {
        const guildEntity = await this.guildHelper.findOrCreateGuild(message.guild.id);
        const guildColourInteractor =
            await new GuildColourInteractor(this.connection, message, guildEntity);
        const colourController = await new ColourController(this.connection, guildEntity);

        const colour = await colourController.find({
            name: params.named.colourName,
        });

        if (colour === undefined) {
            confirm(message, 'failure', 'Colour was not found.');
            return;
        }

        const result = await guildColourInteractor.removeColour(colour);
        switch (result.status) {
            case GuildColourStatus.FAILURE_UPDATE_LIST:
            case GuildColourStatus.SUCCESS_UPDATE_LIST:
                this.updateOrListColours(message);
                break;
        }

        confirm(message, result.type, result.message);
        return true;
    }

    /**
     * An initiate command for a new server.
     * Makes the initial setup process much easier.
     * 
     * It will make the owner define the colour channel,
     * then an admin role,
     * then prompt it for additional, useful features.
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private initiateNewServer: CommandFunction = async (
        message,
        opts,
        params,
        client,
        self,
    ) => {
        const author = message.author;
        const prefix = self.defaultPrefix.str;
        const msg = <Discord.Message>await message.channel.send(
            stripIndents`Welcome to Colour Bot!
            It is recommended to do this command in a mod channel.
            Type \`y\` or \`n\` to confirm continue`);

        const replyMessage = await this.getNextReply(message, author);

        if (replyMessage.content.toLowerCase().startsWith('n')
            || !replyMessage.content.toLowerCase().startsWith('y')) {
            confirm(message, 'failure', 'Command was killed by calle.');
            msg.delete();
            replyMessage.delete();
            return;
        }

        replyMessage.delete();
        msg.edit(
            `Step 1: set a colour channel with using \`${prefix}setchannel #channel\``,
        );

        const nextReply = await this.getNextReply(message, author);
        const chan = nextReply.mentions.channels.first();

        if (!nextReply.content.toLowerCase().includes('setchannel')) {
            confirm(message, 'failure', 'Failed to follow instructions!');
            msg.delete();
            nextReply.delete();
            return;
        }

        msg.edit(
            `Step 2: add your mod group in with \`${prefix}addrole admin @admins\``,
        );

        const adminReply = await this.getNextReply(message, author);
        if (adminReply.mentions.roles.size <= 0
            && !adminReply.content.toLowerCase().includes('addrole admin')) {
            confirm(message, 'failure', 'Failed to follow instructions!');
            msg.delete();
            nextReply.delete();
            return;
        }

        adminReply.delete(1000);

        await msg.edit(
            `Would you like to generate a set of standard rainbow colours?  (\`y\` or \`n\`)`,
        );

        const generateReply = await this.getNextReply(message, author);

        if (generateReply.content.toLowerCase().includes('y')) {
            const generateMessage = <Discord.Message>await message.channel.send('Generating...');

            /* Chill typescript, its fine, we only need a message object. */
            await (this.generateStandardColours as (msg: Discord.Message) => Promise<boolean>)
                (generateMessage);
        }

        generateReply.delete();


        await msg.edit(
            `Would you like to make help message (highly recommended!) (\`y\` or \`n\`)`,
        );

        const helpReply = await this.getNextReply(message, author);

        if (helpReply.content.toLowerCase().includes('y')) {
            const helpMsg = <Discord.Message>await chan.send('Getting Help?');

            (this.createChannelMessage as (msg: Discord.Message) => Promise<boolean>)(helpMsg);
        }


        helpReply.delete();

        await msg.edit(
            `Would you like to create a colour list image? (\`y\` or \`n\`)`,
        );

        const listReply = await this.getNextReply(message, author);

        if (listReply.content.toLowerCase().includes('y')) {
            const listMsg = <Discord.Message>await chan.send('Generating List!');

            /* Again, take a chill pill ts */
            this.updateOrListColours(listMsg, true);
        }

        listReply
            .delete()
            .catch(e => null);

        await msg.edit(
            stripIndents`Alright, initiation procedures completed!
            
            To add existing roles to bot, use 
            \`${prefix}setcolour colour_name role_name\`
            
            You can mention roles or just search by name.
            However if there are mutliple results for a role, bot will not add it.
            Make sure the role search result is unique.

            To quickly add a new colour to the bot, use
            \`${prefix}quickcolour colour_name colour_hex_code\`

            
            To change the settings, use 
            \`${prefix}set {setting} {value}\`.
            
            List all the settings with
            \`${prefix}settings\`. 
            It is recommended to tweak these settings if you wish for automatic colour requests.
            
            It is recommended to pin this message for reference for other admins.
            `,
        );

        const embed = new Discord.RichEmbed()
            .setDescription(
            stripIndents
                // tslint:disable-next-line:max-line-length
                `__It is also recommended you run ${prefix}cycle if you already have colour roles set up__.
                An admin can do this for you, if you wish.`,
        ).setThumbnail(client.user.avatarURL);

        const prompt = <Discord.Message>await message.channel.send({ embed });
        prompt.delete(15000);

        confirm(message, 'success')
            .catch(e => null);
        return true;
    }

    /**
     * A helper utility for servers that already have colour roles.
     * It'll loop through each role, allowing the user to specify if
     * they want to add a role, and allows them to set a name for it.
     * 
     * @private
     * @type {CommandFunction}
     * @memberof Colourizer
     */
    private cycleExistingRoles: CommandFunction = async (
        message,
    ) => {
        const roles = message.guild.roles;
        const { author } = message;

        const guildEntity = await this.guildHelper.findOrCreateGuild(message.guild.id);

        const chan = <Discord.TextChannel>message
            .guild
            .channels
            .find('id', guildEntity.channel);

        if (guildEntity.channel === undefined || chan === undefined) {
            confirm(
                message,
                'failure',
                'Set a colour channel before running this command!',
                { delete: true, delay: 3000 },
            );
            return;
        }

        const baselinePerms =
            Object
                .entries(
                roles
                    .find('id', message.guild.id)
                    .serialize(),
            )
                .filter(([role, has]) => has)
                .map(([role, has]) => role);

        const msg = <Discord.Message>await message.channel.send(
            stripIndents`
            Welcome! This command will cycle through all existing roles to add them to the bot.
            You can choose the name for each colour after a confirmation.
            It is recommended you run this command in a mod channel.
            Would you like to continue? (\`y\` or \`n\`)`,
        );

        const reply = await this.getNextReply(message, author);

        if (reply.content.toLowerCase().startsWith('n')) {
            reply.delete();
            confirm(message, 'failure', 'Function was aborted by user!');
            return;
        }

        reply.delete();

        const guildColourInteractor =
            await new GuildColourInteractor(this.connection, message, guildEntity);

        const colourController = new ColourController(this.connection, guildEntity);
        const allColours = await colourController.index();
        const coloursTable =
            allColours.map(colour => [colour.roleID, colour]);


        for (const [id, role] of roles) {
            if (role.managed || role.name === '@everyone') {
                msg.edit({ embed: { description: 'Skipping special role...' } });
                sleep(1000);
                continue;
            }


            const permissions =
                Object
                    .entries(role.serialize())
                    .filter(([role, has]) => has)
                    .map(([role, has]) => role);

            const embed = new Discord.RichEmbed()
                .setColor(role.color)
                .setTitle(`Role: ${role.name}`)
                .addField(
                'Confirm',
                oneLineTrim`
                    Would you like to add this role? 
                    (\`y\` or \`n\` or \`cancel\` or \`finish\`)`,
            )
                .setDescription('The colour for this role is the highlight on the side.')
                .addField(
                'Warnings',
                (baselinePerms.length !== permissions.length)
                    ? '❌ Warning. This role may have special permissions!'
                    : '☑️ This role looks fine!',
            );

            msg.edit({ embed });

            const reply = await this.getNextReply(message, author);
            const contents = reply.content.toLowerCase();

            if (contents.startsWith('n')) {
                reply.delete();
                continue;
            }

            if (contents.startsWith('cancel')) {
                confirm(message, 'failure', 'Function was canceled!');
                msg.delete();
                reply.delete();
                return;
            }

            if (contents.startsWith('finish')) {
                reply.delete();
                break;
            }

            if (!contents.startsWith('y')) {
                confirm(message, 'failure', 'Bad input given!');
                reply.delete();
                return;
            }

            reply.delete();

            const setName = new Discord.RichEmbed()
                .setColor(role.color)
                .addField('Name', 'Type in the color name for this role.')
                .addField('Default', `To set as ${role.name}, type =default`, true)
                .addField('Cancel', 'To cancel, type =cancel', true);


            msg.edit({ embed: setName });

            const name = await this.getNextReply(message, author);

            if (name.content.toLowerCase().startsWith('=cancel')) {
                name.delete();
                continue;
            }

            const roleName = (name.content.toLowerCase().startsWith('=default'))
                ? role.name
                : name.content;

            guildColourInteractor.createOrUpdateColour(role, roleName);
            name.delete();
        }

        const generator = <Discord.Message>await chan.send('Generating colours...!');
        this.updateOrListColours(generator, true);

        await msg.edit({ embed: { description: `Wohoo, that's all the roles!` } });
        msg.delete(2000);
        confirm(message, 'success');
        return true;
    }

    /**
     * 
     * Helper method for getting a user reply.
     * 
     * @private
     * @param {Discord.Message} message 
     * @param {Discord.User} author 
     * @returns 
     * @memberof Colourizer
     */
    private async getNextReply(message: Discord.Message, author: Discord.User) {
        const reply = await message.channel.awaitMessages(
            msg => msg.author.id === author.id,
            {
                maxMatches: 1,
            },
        );
        return reply.first();
    }
}
