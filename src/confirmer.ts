import * as Discord from 'discord.js';

interface Status {
    success: string;
    failure: string;
}

const statusCodes: Status = {
    success: '✅',
    failure: '❌',
};

type Codes = keyof Status;

interface ConfirmOptions {
    delete: boolean;
    delay: number;
}

const confirm = async (
    message: Discord.Message, 
    type: Codes, 
    reason?: string, 
    options: ConfirmOptions = {
        delete: true,
        delay: 3000,
    },
) => {
    message.react(statusCodes[type]);
    if (reason) {
        const replyMessage = await message.reply(`**Alert:** ${reason}`);
        if (options.delete) {
            const reply = Array.isArray(replyMessage) ? replyMessage[0] : replyMessage;
            reply.delete(options.delay || 3000);
        }

    }

    if (options.delete) {
        message.delete(options.delay || 3000);

    }
};

export interface DispatchOptions {
    edit?: boolean;
    delay?: number;
    delete?: boolean;
}

const dispatch = async (
         message: Discord.Message,
         content?: string | any | undefined, 
         messageOptions?: Discord.MessageOptions, 
         options?: DispatchOptions,
    ) => {
    const opts = (options != null) 
        ? { edit: false, delay: 3000, delete: true, ...options  }
        : { edit: false, delay: 3000, delete: true };

    if (opts.edit) {
        const msg = await message.edit(content, messageOptions);
        if (opts.delete) {
            msg.delete(opts.delay);
            message.delete(opts.delay);
        }
        return msg;
    }

    if (content != null) {
        const msg = await message.channel.send(content, messageOptions); 
        if (Array.isArray(msg)) { 
            msg.forEach(message => message.delete(opts.delay));
            message.delete(opts.delay);
            return msg;
        }
        if (opts.delete) {
            msg.delete(opts.delay);
            message.delete(opts.delay);
        }
        return msg;
    }

    const msg = await message.channel.send(messageOptions);
    if (Array.isArray(msg)) {
        msg.forEach(message => message.delete(opts.delay));
        if (opts.delete) {
            message.delete(opts.delay);
        }
        return msg;
    }
    if (opts.delete) {
        msg.delete(opts.delay);
        message.delete(opts.delay);
    }
    return msg;
};

export {
    confirm,
    statusCodes,
    dispatch,
};

