
import * as fs from 'fs';

export function writeFile(obj,name) {
    const json = JSON.stringify(obj);

    fs.writeFile(name, json, err => {
        if (err) {
            console.log("file not written to, an error was encountered.");
            console.error(err);
        } else {
            console.log("file written successfully");
        }
    });

}

export function writeFileText(text,name) {

    fs.writeFile(name, text, err => {
        if (err) {
            console.log("file not written to, an error was encountered.");
            console.error(err);
        } else {
            console.log("file written successfully");
        }
    });

}

export function getFileText(path) {
    return fs.readFileSync(path, 'utf8');
}
