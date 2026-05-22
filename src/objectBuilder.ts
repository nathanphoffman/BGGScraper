import { writeFile, writeFileText, makeDirectory } from "./file";
import { clean, getDupIndex } from "./utility";
import { Game } from "./types/game";

export function mergeDuplicateRecords(arr: Game[]): Game[] {

    const processedIndexes: number[] = [];
    const unDuped = arr.map((item, idx) => {

        const dupIndex = getDupIndex(arr, item, idx);
        if (dupIndex === -1 || processedIndexes.includes(idx)) return item;

        // merge weights for more accurate reading -- as dups means they caught on either end of the divide of pagination by weighting
        const dupItem = arr[dupIndex];
        processedIndexes.push(Number(dupIndex));
        arr[dupIndex].weight = (dupItem.weight + item.weight) / 2;
        return undefined;
    });

    return clean(unDuped);
}

function getRankedList(records: Game[]): string {
    return records.map((game, idx) => `${idx + 1}. ${game.title} (${game.releaseDate}) #${game.rank}`).join('\n');
}

function getMostDisagreedUpon(records: Game[]): string {
    let idx = 1;

    // there is no point in getting more than top 500 as they may be poor and strange
    for (let record of records) {
        record.disagree = record.rank && Number(record.rank) > 0 && Number(record.rank) < 1000 ? Number(record.rank) - idx : -9999;
        record.nateRank = idx;
        idx++;
    }

    records.sort((a, b) => (b.disagree ?? 0) - (a.disagree ?? 0));
    return records.filter(x => x.disagree !== -9999).map((game) => `${game.title} (${game.releaseDate}) BGG #${game.rank} -> NOW #${game.nateRank}, ${-(game.disagree ?? 0)}`).join('\n');
}

function getMostRecent(records: Game[]): string {
    let output = '';
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year > 2000; year--) {
        const games = records.filter(x => Number(x.releaseDate) === year).map((game, idx) => `${idx + 1}. ${game.title} (${game.releaseDate}) #${game.rank}`);
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

    for (let record of records) {
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
    return records.map((game, idx) => `${idx + 1}. ${game.title} (${game.releaseDate}) #${game.rank}`).join('\n');
}


function getScoreWithBias(record: Game, bias: number, bias_multiplier: number, bias_base: number): number {

    let bias_distance = Math.abs(record.weight - bias);

    // this punishes heavier games over the weight preference twice as much as lighter games since lighter games are easier to get to the table
    if (record.weight > bias) bias_distance = bias_distance * 2;
    const biasFactor = bias === 0 ? bias_base : bias_base + bias_multiplier * bias_distance;

    const numAverage = Number(record.average);
    const cappedAverage = numAverage > 8.75 ? 8.75 : numAverage;

    const calculatedBias = getCalculatedBias(cappedAverage, biasFactor, Number(record.num));
    return calculatedBias;
}

function getCalculatedBias(score: number, biasFactor: number, numberOfRatings: number): number {
    return Math.pow((score / 10), biasFactor) * Math.log10(numberOfRatings);
}

export function getRecordsWithBias(records: Game[], bias: number, bias_multiplier: number, bias_base: number): Game[] {

    for (let record of records) {
        record.score = getScoreWithBias(record, bias, bias_multiplier, bias_base);
    }

    return getRecordsWithScores(records);
}

function getRecordsWithScores(records: Game[]): Game[] {
    return [...records.filter((x) => !!x.score)];
}

export function getRecordsWithLightToHeavyBias(records: Game[]): Game[] {

    for (let record of records) {
        if (!record.weight || isNaN(record.weight)) continue;
        const newBias = record.weight < 2 ? 2 : 1.33 + record.weight / 3;
        record.score = getCalculatedBias(record.score ?? 0, newBias, Number(record.num));
    }

    return getRecordsWithScores(records);
}

export function scoreRecordsAndRecord(records: Game[], bias: number, bias_multiplier: number, bias_base: number): void {

    makeDirectory(getPath(String(bias), String(bias_multiplier)), () => {

        const newRecords = getRecordsWithBias(records, bias, bias_multiplier, bias_base);

        const path: string = getPath(String(bias), String(bias_multiplier));

        newRecords.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        writeFile(newRecords, `${path}/raw_objects.json`);

        const list = getRankedList([...newRecords]);
        writeFileText(list, `${path}/ALL_RANKINGS.txt`);

        if (bias === 0) {
            const preparedRecords = getRecordsWithLightToHeavyBias([...records]);
            preparedRecords.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
            const heavyBias = getRankedList([...preparedRecords]);
            writeFileText(heavyBias, `${path}/BIASED_AGAINST_HEAVY.txt`);
        }

        const mostDisagreed = getMostDisagreedUpon([...newRecords]);
        writeFileText(mostDisagreed, `${path}/disagreement.txt`);

        const mostRecent = getMostRecent([...newRecords]);
        writeFileText(mostRecent, `${path}/RANKINGS_BY_YEAR.txt`);

        const favorNewGames = getNewGameBias([...newRecords]);
        writeFileText(favorNewGames, `${path}/RANKINGS_BIAS_NEW.txt`);
    });
}

function getPath(bias: string, bias_multiplier: string): string {
    return `output/${bias}`;
}
