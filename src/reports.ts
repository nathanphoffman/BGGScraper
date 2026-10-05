import { writeFile, writeFileText, makeDirectory } from "./file";
import { Game } from "./types/game";
import { copyRecords } from "./records";
import { applyNewGameBias, getRecordsWithBias, getRecordsWithLightToHeavyBias } from "./scoring";

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

function getPath(bias: number): string {
    return `output/${bias}`;
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

    const favorNewGames = getRankedList(applyNewGameBias(copyRecords(newRecords)));
    writeFileText(favorNewGames, `${path}/RANKINGS_BIAS_NEW.txt`);
}
