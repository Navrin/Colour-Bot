import * as Discord from 'discord.js';

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
    dispatch,
};
