import * as fs from 'fs';

export function writeFile(obj: object, name: string): void {
    fs.writeFileSync(name, JSON.stringify(obj));
}

export function writeFileText(text: string, name: string): void {
    fs.writeFileSync(name, text);
}

export function getFileText(path: string): string | null {
    if (fs.existsSync(path)) {
        return fs.readFileSync(path, 'utf8');
    }
    return null;
}

export function makeDirectory(dir: string): void {
    fs.mkdirSync(dir, { recursive: true });
}
