export
interface ListColour {
    name: string;
    hexColour: string;
}

export default (colours: ListColour[]) => (
    `<html style="margin: 0">
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
                    color: #${(0xFFFFFF ^ parseInt(hexColour, 16)).toString(16)};
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
                    color: #${(0xFFFFFF ^ parseInt(hexColour, 16)).toString(16)};
                    float: right;"> 
                    <span style="width: 80%;">
                        ${hexColour.replace('#', '')}
                    </span>
                </div> 
            </div>`;
    },
    ).join('\n')}
    </div>
</html>`
);
