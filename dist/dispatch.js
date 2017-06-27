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
const dispatch = (message, content, messageOptions, options) => __awaiter(this, void 0, void 0, function* () {
    const opts = (options != null)
        ? Object.assign({ edit: false, delay: 5000, delete: true }, options) : { edit: false, delay: 5000, delete: true };
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
            yield msg.delete(opts.delay);
            yield message.delete(opts.delay);
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
