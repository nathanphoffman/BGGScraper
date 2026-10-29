import * as fs from 'fs';
import { Game } from "./types/game";
import { gameKey } from "./records";
import { makeDirectory } from "./file";
import { DAY_MS } from "./utility";

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
    const pulledAt = new Date().toISOString().slice(0, 10);
    for (const game of games) {
        database.set(gameKey(game), { ...game, pulledAt });
    }
}

// a year is stale when its least recently pulled game is older than maxAgeDays, the stalest year comes first
export function getStaleYears(database: Map<string, Game>, maxAgeDays: number): number[] {
    const oldestPull = new Map<number, number>();
    for (const game of database.values()) {
        if (!/^\d{4}$/.test(game.releaseDate)) continue;
        const year = Number(game.releaseDate);
        const pulled = game.pulledAt ? Date.parse(game.pulledAt) : 0;
        oldestPull.set(year, Math.min(oldestPull.get(year) ?? Infinity, pulled));
    }

    return [...oldestPull.entries()]
        .filter(([, pulled]) => Date.now() - pulled > maxAgeDays * DAY_MS)
        .sort((a, b) => a[1] - b[1])
        .map(([year]) => year);
}
