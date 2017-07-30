const webshot = require('webshot');
const createShot = (html: string, file: string, settings: any) => {
    return new Promise((res, rej) => {
        webshot(html, file, settings, (err: any) => {
            if (err) {
                rej(err);
            }

            res();
        });
    });
};

export {
    createShot,
};

