import { ColourRequest } from './models/colourRequest';
import { CommandDefinition, CommandFunction, RoleTypes } from 'simple-discordjs';
import { Connection } from 'typeorm';
import { confirm } from './confirmer';
import UserController from './controllers/UserController';
import UserHelper from './helpers/UserHelper';
import GuildHelper from './helpers/GuildHelper';
import GuildController from './controllers/GuildController';
import Colourizer from './Colourizer';
import RequestController from './controllers/RequestController';
import GuildRequestInteractor, { RequestColourStatus } from './interactions/GuildRequestInteractor';
import GuildColourInteractor, { GuildColourStatus } from './interactions/GuildColourInteractor';
import * as Discord from 'discord.js';
import { stripIndents, oneLineTrim } from 'common-tags';
import UserColourInteractor from './interactions/UserColourInteractor';
import { Colour } from './models/colour';
const sleep = (delay: number) => new Promise((res, rej) => {
    setTimeout(() => res(), delay);
});
const _ntc = require('name-this-color');
const colourName: (name: string) => {
    hex: string,
    match: boolean,
    name: string,
    title: string,
} = name => _ntc(name)[0];

const COLOUR_MATCH = /(?:#)?[0-9a-f]{6}/;

export
    class RequestCommands {
    colourizer: Colourizer;
    guildController: GuildController;
    guildHelper: GuildHelper;
    userHelper: UserHelper;
    userControler: UserController;
    connection: Connection;

    constructor(connection: Connection, colourizer: Colourizer) {
        this.connection = connection;
        this.userControler = new UserController(this.connection);
        this.userHelper = new UserHelper(this.userControler);
        this.guildHelper = new GuildHelper(this.connection);
        this.guildController = new GuildController(this.connection);
        this.colourizer = colourizer;
    }

    public getRequestColour: () => CommandDefinition = () => ({
        command: {
            action: this.requestNewColour,
            names: ['request', 'newcolour', 'requestcolour'],
            parameters: '{{colour}}',
        },
        description: {
            message: 'Request a new colour to be added',
            example: '{{{prefix}}}request #c0c0c0',
        },
    })

    public getRemoveRequest: () => CommandDefinition = () => ({
        command: {
            action: this.cancelRequest,
            names: ['cancelrequest', 'cancel'],
        },
        description: {
            message: 'Cancels whatever request you have active',
            example: '{{{prefix}}}cancel',
        },
    })

    public getCycleRequests: () => CommandDefinition = () => ({
        command: {
            action: this.cycleRequests,
            names: ['requests', 'allrequests'],
        }, 
        authentication: RoleTypes.ADMIN,
        description: {
            message: 'Parses all active colour requests',
            example: '{{{prefix}}}allrequests',
        },
    })

    /**
     * Creates a new request for the guild.
     * 
     * @type {CommandFunction}
     * @memberof RequestCommands
     */
    requestNewColour: CommandFunction = async (message, opts, params: {
        array: string[],
        named: {
            colour: string,
        },
    }) => {
        if (!COLOUR_MATCH.test(params.named.colour)) {
            confirm(message, 'failure', 'No colour was specified!');
            return;
        }

        const guildEntity = await this.guildHelper.findOrCreateGuild(message.guild.id);
        const userEntity = await this.userHelper.findOrCreateUser(message.author.id, guildEntity);

        if (userEntity.requests[0]) {
            confirm(
                message,
                'failure',
                'You already have a pending colour request! `cancel` your current one or wait!',
            );
            return;
        }

        const requestController = new RequestController(this.connection, guildEntity);
        const guildRequestInteractor =
            new GuildRequestInteractor(this.connection, message, guildEntity);
        const request =
            await guildRequestInteractor.createNewRequest(message.author, params.named.colour);


        switch (request.status) {
            case RequestColourStatus.FAILURE_UPDATE_LIST:
            case RequestColourStatus.SUCCESS_UPDATE_LIST:
                this.colourizer.updateOrListColours(message);
        }


        if (request.type === 'success' 
            && guildEntity.settings 
            && guildEntity.settings.autoAcceptRequests) {
            const name = colourName(params.named.colour).title.toLowerCase();
            const reponse = await this.parseRequest(message, <ColourRequest>request.data, name);
            
            const interactor = new UserColourInteractor(this.connection, message, guildEntity);
            await interactor.addColour(<Colour>reponse.data);
        }

        confirm(message, request.type, request.message);
    }

    cancelRequest: CommandFunction = async (message) => {
        const guildEntity = await this.guildHelper.findOrCreateGuild(message.guild.id);
        const userEntity = await this.userHelper.findOrCreateUser(message.author.id, guildEntity);
        
        const request = userEntity.requests[0];

        if (request === undefined) {
            confirm(message, 'failure', 'You don\'t have a pending request.');
            return;
        }

        const requestController = new RequestController(this.connection, guildEntity);
        await requestController.delete(request.id);
        confirm(message, 'success');
    }

    /**
     * Turns a request into a persisted colour.
     * 
     * @param {Discord.Message} message 
     * @param {ColourRequest} request 
     * @param {string} name 
     * @returns 
     * @memberof RequestCommands
     */
    async parseRequest(message: Discord.Message, request: ColourRequest, name: string) {
        const guildColourInteractor =
            new GuildColourInteractor(this.connection, message, request.guild);

        const requestController = new RequestController(this.connection, request.guild);


        const colour = await message.guild.createRole({
            name,
            color: request.colour,
        });

        const colourEntity = await guildColourInteractor.createOrUpdateColour(colour, name);

        switch (colourEntity.status) {
            case GuildColourStatus.FAILURE_UPDATE_LIST:
            case GuildColourStatus.SUCCESS_UPDATE_LIST:
                this.colourizer.updateOrListColours(message);
        }

        await requestController.delete(request.id);

        return colourEntity;
    }

    cycleRequests: CommandFunction = async (message) => {
        const replier = <Discord.Message>await message.channel.send(stripIndents`
            This command will cycle through all the current requests for the guild.
            It is recommended you do this in a moderation channel.
            Would you like to continue? \`y\` or \`n\`
        `);

        const firstReply = await this.getNextReply(message, message.author);
        const firstReplyContents = firstReply.content.toLowerCase();

        if (firstReplyContents.startsWith('n') || !firstReplyContents.startsWith('y')) {
            confirm(message, 'failure', 'Command was canceled by the user!');
            return;
        }

        firstReply.delete();

        const guildEntity = await this.guildHelper.findOrCreateGuild(message.guild.id);

        const requestController = new RequestController(this.connection, guildEntity);

        const requests = await requestController.index();

        for (const request of requests) {
            const requester = message.guild.members.get(request.user.id);

            if (requester === undefined) {
                replier.edit('Requester left the server, skipping...');
                requestController.delete(request.id);
                await sleep(1500);
                continue;
            }

            const embed = new Discord.RichEmbed()
                .setColor(request.colour)
                .setTitle(`Request Colour: ${request.colour}`)
                .addField(`Requester`, `User ${requester.displayName} requested this.`)
                .addField(`Confirm?`, oneLineTrim`
                    Would you like to confirm this request? 
                    (\`y\` or \`n\` or \`cancel\` or \`finish\`)`);
            await replier.edit({ embed });

            const nextReply = await this.getNextReply(message, message.author);
            const contents = nextReply.content.toLowerCase();

            if (contents.startsWith('n')) {
                nextReply.delete();
                continue;
            }

            if (contents.startsWith('cancel')) {
                confirm(message, 'failure', 'Function was canceled!');
                replier.delete();
                nextReply.delete();
                return;
            }

            if (contents.startsWith('finish')) {
                nextReply.delete();
                break;
            }

            if (!contents.startsWith('y')) {
                confirm(message, 'failure', 'Bad input given!');
                nextReply.delete();
                return;
            }

            nextReply.delete();

            const nextEmbed = new Discord.RichEmbed()
                .setColor(request.colour)
                .addField('Name', 'Type in the color name for this role.')
                .addField(
                    'Automatic', 
                    `To set as **${colourName(request.colour).title.toLowerCase()}**, type =auto`)
                .addField('Cancel', 'To cancel, type =cancel');

            await replier.edit({ embed: nextEmbed });

            const finalReply = await this.getNextReply(message, message.author);
            const replyContents = finalReply.content.toLowerCase();

            if (replyContents.startsWith('=cancel')) {
                finalReply.delete();
                continue;
            }

            const roleName = (replyContents.startsWith('=auto')) 
                ? colourName(request.colour).title.toLowerCase()
                : replyContents;
            
            await this.parseRequest(message,request, roleName);
            finalReply.delete();
        }

        if (guildEntity.listmessage) {
            const chan = <Discord.TextChannel>message.guild.channels.get(guildEntity.listmessage);
            
            if (chan) {
                const generator = <Discord.Message>await chan.send('Generating colours...!');
                this.colourizer.updateOrListColours(generator, true);
            }
        }

        replier.edit({
            embed: {
                description: 'All done!',
            },
        });

        replier.delete(3000);
        confirm(message, 'success');
        return true;
    }


    /**
     * Gets a reply from the user.
     * 
     * @private
     * @param {Discord.Message} message 
     * @param {Discord.User} author 
     * @returns 
     * @memberof RequestCommands
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
