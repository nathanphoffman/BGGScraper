import * as fs from 'fs';
import { Game } from "./types/game";
import { gameKey } from "./records";
import { makeDirectory } from "./file";

const DATABASE_FILE = 'data/games.json';

export function databaseExists(): boolean {
    return fs.existsSync(DATABASE_FILE);
}

// games are stored by title and release year, newer scrapes replace older ones
export function loadDatabase(): Map<string, Game> {
    if (!databaseExists()) {
        return new Map();
    }
    return new Map(Object.entries(JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'))));
}

export function saveDatabase(database: Map<string, Game>): void {
    makeDirectory('data');
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(Object.fromEntries(database), null, 1));
}

export function updateDatabase(database: Map<string, Game>, games: Game[]): void {
    for (const game of games) {
        database.set(gameKey(game), game);
    }
}
