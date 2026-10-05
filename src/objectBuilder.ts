import { writeFile, writeFileText, makeDirectory } from "./file";
import { Game } from "./types/game";
import { BIAS_BASE, BIAS_MULTIPLIER, MAX_AVERAGE_RATING } from "./config";

// each game gets its own copy so one bias run can't change the scores of another
function copyRecords(records: Game[]): Game[] {
    return records.map(record => ({ ...record }));
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

function formatRank(rank: number | null): string {
    return rank === null ? '' : String(rank);
}

function formatListLine(game: Game, idx: number): string {
    return `${idx + 1}. ${game.title} (${game.releaseDate}) #${formatRank(game.rank)}`;
}

function getRankedList(records: Game[]): string {
    return records.map(formatListLine).join('\n');
}

function getMostDisagreedUpon(records: Game[]): string {
    let idx = 1;

    // there is no point in getting more than top 1000 as they may be poor and strange
    for (const record of records) {
        record.disagree = record.rank !== null && record.rank > 0 && record.rank < 1000 ? record.rank - idx : undefined;
        record.newRank = idx;
        idx++;
    }

    records.sort((a, b) => (b.disagree ?? 0) - (a.disagree ?? 0));
    return records.filter(x => x.disagree !== undefined).map((game) => `${game.title} (${game.releaseDate}) BGG #${formatRank(game.rank)} -> NOW #${game.newRank}, ${-(game.disagree ?? 0)}`).join('\n');
}

function getMostRecent(records: Game[]): string {
    let output = '';
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year > 2000; year--) {
        const games = records.filter(x => Number(x.releaseDate) === year).map(formatListLine);
        const topGames = games.slice(0, 75).join('\n');
        output += `${year}\n----------\n${topGames}\n\n-----------\n`;
    }

    return output;
}

function getNewGameBias(records: Game[]): string {

    // +1 covers the games that are newest releases
    const currentYear = new Date().getFullYear() + 1;
    const recentCutoffYear = currentYear - 5;
    const oldCutoffYear = recentCutoffYear - 5;
    const modifier = 1.15;

    for (const record of records) {
        // if it is a very old game or we don't know the date we punish it even more:
        if (!record.releaseDate || Number(record.releaseDate) < oldCutoffYear) {
            record.score = (record.score ?? 0) * (2 - modifier);
        }
        else {
            const year = Number(record.releaseDate) < recentCutoffYear ? recentCutoffYear : Number(record.releaseDate);
            record.score = (record.score ?? 0) * (1 + Math.pow(year - recentCutoffYear, modifier) / 25);
        }
    }

    records.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return getRankedList(records);
}


function getScoreWithBias(record: Game, bias: number): number {

    let bias_distance = Math.abs(record.weight - bias);

    // this punishes heavier games over the weight preference twice as much as lighter games since lighter games are easier to get to the table
    if (record.weight > bias) bias_distance = bias_distance * 2;
    const biasFactor = bias === 0 ? BIAS_BASE : BIAS_BASE + BIAS_MULTIPLIER * bias_distance;

    const cappedAverage = Math.min(record.average, MAX_AVERAGE_RATING);

    const calculatedBias = getCalculatedBias(cappedAverage, biasFactor, record.num);
    return calculatedBias;
}

function getCalculatedBias(score: number, biasFactor: number, numberOfRatings: number): number {
    return Math.pow((score / 10), biasFactor) * Math.log10(numberOfRatings);
}

export function getRecordsWithBias(records: Game[], bias: number): Game[] {

    const copies = copyRecords(records);
    for (const record of copies) {
        record.score = getScoreWithBias(record, bias);
    }

    return getRecordsWithScores(copies);
}

function getRecordsWithScores(records: Game[]): Game[] {
    return [...records.filter((x) => !!x.score)];
}

export function getRecordsWithLightToHeavyBias(records: Game[]): Game[] {

    // games without a usable weight can't be scored here, so they are left out
    const copies = copyRecords(records).filter(record => record.weight && !isNaN(record.weight));
    for (const record of copies) {
        const newBias = record.weight < 2 ? 2 : 1.33 + record.weight / 3;
        record.score = getCalculatedBias(record.score ?? 0, newBias, record.num);
    }

    return getRecordsWithScores(copies);
}

export function writeRankingsForBias(records: Game[], bias: number): void {

    const path: string = getPath(bias);
    makeDirectory(path);

    const newRecords = getRecordsWithBias(records, bias);

    newRecords.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    writeFile(newRecords, `${path}/raw_objects.json`);

    const list = getRankedList(newRecords);
    writeFileText(list, `${path}/ALL_RANKINGS.txt`);

    if (bias === 0) {
        // builds on top of the scores from getRecordsWithBias
        const preparedRecords = getRecordsWithLightToHeavyBias(newRecords);
        preparedRecords.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        const heavyBias = getRankedList(preparedRecords);
        writeFileText(heavyBias, `${path}/BIASED_AGAINST_HEAVY.txt`);
    }

    const mostDisagreed = getMostDisagreedUpon(copyRecords(newRecords));
    writeFileText(mostDisagreed, `${path}/disagreement.txt`);

    const mostRecent = getMostRecent(newRecords);
    writeFileText(mostRecent, `${path}/RANKINGS_BY_YEAR.txt`);

    const favorNewGames = getNewGameBias(copyRecords(newRecords));
    writeFileText(favorNewGames, `${path}/RANKINGS_BIAS_NEW.txt`);
}

function getPath(bias: number): string {
    return `output/${bias}`;
}
