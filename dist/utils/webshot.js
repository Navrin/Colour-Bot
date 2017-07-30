"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webshot = require('webshot');
const createShot = (html, file, settings) => {
    return new Promise((res, rej) => {
        webshot(html, file, settings, (err) => {
            if (err) {
                rej(err);
            }
            res();
        });
    });
};
exports.createShot = createShot;
