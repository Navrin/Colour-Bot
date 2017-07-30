"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _toRGB = require('hex-rgb');
const hexToRGB = (hex) => {
    const [r, g, b] = _toRGB(hex);
    return {
        r,
        g,
        b,
    };
};
const getContrastColour = ({ r, g, b, }) => {
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
};
exports.default = (colours) => (`<html style="margin: 0">
    <div id="list" style="
        font-size: 60px; 
        margin-top: 0;
        margin: 0;
        font-family: sans-serif;
        width: 100vw; 
        height: 100vh">
       ${colours.map(({ hexColour, name }) => {
    return `
            <div style="width: 50%; display: flex; float: left;"> 
                <div style="
                    width: 80%; 
                    float: left;
                    text-align: center;
                    background-color: white;
                    color: ${hexColour}"> 
                    <span style="padding-left: 15px;">
                        ${name.replace('colour-', '')} 
                    </span>
                </div>
                <div style="
                    width: 20%; 
                    background-color: ${hexColour}; 
                    color: ${getContrastColour(hexToRGB(hexColour))};
                    float: right;"> 
                    <span style="width: 80%;">
                        ${hexColour.replace('#', '')}
                    </span>
                </div> 
            </div>
            <div style="
                width: 50%; 
                display: flex; 
                float: right;
                background-color: #36393e"> 
                <div style="
                    width: 80%; 
                    text-align: center;
                    float: left;
                    color: ${hexColour}"> 
                    ${name.replace('colour-', '')} 
                </div>
                <div style="
                    width: 20%; 
                    background-color: ${hexColour}; 
                    color: ${getContrastColour(hexToRGB(hexColour))};
                    float: right;"> 
                    <span style="width: 80%;">
                        ${hexColour.replace('#', '')}
                    </span>
                </div> 
            </div>`;
}).join('\n')}
    </div>
</html>`);
