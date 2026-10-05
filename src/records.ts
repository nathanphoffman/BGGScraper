import { Game } from "./types/game";
import { EXCLUDED_TITLE_PREFIXES } from "./config";

// each game gets its own copy so one bias run can't change the scores of another
export function copyRecords(records: Game[]): Game[] {
    return records.map(record => ({ ...record }));
}

export function removeUnwantedRecords(records: Game[]): Game[] {
    return records.filter(x => !EXCLUDED_TITLE_PREFIXES.some(prefix => x.title.toUpperCase().startsWith(prefix)));
}

export function mergeDuplicateRecords(arr: Game[]): Game[] {

    // dups mean a game was caught on either end of the divide of pagination by weighting,
    // so average all of their weights for a more accurate reading
    const groups = new Map<string, Game[]>();
    for (const item of arr) {
        const key = `${item.title}|${item.releaseDate}`;
        groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    return [...groups.values()].map(dups => ({
        ...dups[0],
        weight: dups.reduce((sum, dup) => sum + dup.weight, 0) / dups.length
    }));
}
