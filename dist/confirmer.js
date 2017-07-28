"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const statusCodes = {
    success: '✅',
    failure: '❌',
};
exports.statusCodes = statusCodes;
const confirm = (message, type, reason, options = {
        delete: true,
        delay: 3000,
    }) => __awaiter(this, void 0, void 0, function* () {
    message.react(statusCodes[type]);
    if (reason && type === 'failure') {
        const replyMessage = yield message.reply(`**Alert:** ${reason}`);
        if (options.delete) {
            const reply = Array.isArray(replyMessage) ? replyMessage[0] : replyMessage;
            reply.delete(options.delay || 3000);
        }
    }
    if (options.delete) {
        message.delete(options.delay || 3000);
    }
});
exports.confirm = confirm;
const dispatch = (message, content, messageOptions, options) => __awaiter(this, void 0, void 0, function* () {
    const opts = (options != null)
        ? Object.assign({ edit: false, delay: 3000, delete: true }, options) : { edit: false, delay: 3000, delete: true };
    if (opts.edit) {
        const msg = yield message.edit(content, messageOptions);
        if (opts.delete) {
            msg.delete(opts.delay);
            message.delete(opts.delay);
        }
        return msg;
    }
    if (content != null) {
        const msg = yield message.channel.send(content, messageOptions);
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
    const msg = yield message.channel.send(messageOptions);
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
});
exports.dispatch = dispatch;
