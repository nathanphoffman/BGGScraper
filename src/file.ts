
import * as fs from 'fs';
//import {mkdir} from 'fs';
import { mkdir } from 'node:fs';

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
    if (fs.existsSync(path)) {
        return fs.readFileSync(path, 'utf8');
    }
    else return null;
}

export function makeDirectory(dir: string, fn: any) {
    if(!dir) return;
    // Creates /tmp/a/apple, regardless of whether `/tmp` and /tmp/a exist.
     mkdir(dir,fn);
}