import { Game } from "./types/game";
import { BIAS_BASE, BIAS_MULTIPLIER, MAX_AVERAGE_RATING } from "./config";
import { copyRecords } from "./records";

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

function getRecordsWithScores(records: Game[]): Game[] {
    return [...records.filter((x) => !!x.score)];
}

export function getRecordsWithBias(records: Game[], bias: number): Game[] {

    const copies = copyRecords(records);
    for (const record of copies) {
        record.score = getScoreWithBias(record, bias);
    }

    return getRecordsWithScores(copies);
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

// changes the scores of the records it is given, so pass in a copy
export function applyNewGameBias(records: Game[]): Game[] {

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

    return records.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
