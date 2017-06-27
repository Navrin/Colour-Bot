import * as Discord from 'discord.js';

export interface DispatchOptions {
    edit: boolean;
    delay: number;
}

const dispatch = async (
         message: Discord.Message,
         content?: string | any | undefined, 
         messageOptions?: Discord.MessageOptions, 
         options?: DispatchOptions
    ) => {
    console.log('dude what the fucl');
    const opts = (options != null) 
        ? { edit: false, delay: 500, ...options  }
        : { edit: false, delay: 500 };

    if (opts.edit) {
        const msg = await message.edit(content, messageOptions);
        msg.delete(opts.delay);
        message.delete(opts.delay);
        return msg;
    }

    if (content != null) {
        const msg = await message.channel.send(content, messageOptions); 
        if (Array.isArray(msg)) { 
            msg.forEach(message => message.delete(opts.delay));
            message.delete(opts.delay);
            return msg;
        }
        await msg.delete(opts.delay);
        await message.delete(opts.delay);
        return msg;
    }

    const msg = await message.channel.send(messageOptions);
    if (Array.isArray(msg)) {
        msg.forEach(message => message.delete(opts.delay));
        message.delete(opts.delay);
        return msg;
    }
    msg.delete(opts.delay);
    message.delete(opts.delay);
    return msg;
}


export {
    dispatch
};
