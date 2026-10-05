import { mergeDuplicateRecords, removeUnwantedRecords } from "../records";
import { writeRankingsForBias } from "../reports";
import { sleep } from "../utility";
import { CUSTOM_GAMES, WEIGHT_PREFERENCES } from "../config";
import { getObjects } from "./parser";
import { closeBrowser } from "./memoizer";
import { Game } from "../types/game";

// weights on bgg range from 1 to 5, but in practice there is no reason a weight should ever be anywhere close to 4.9 or above
// unless there is an anamoly, which we wouldn't want to pull in anyway
const MAX_WEIGHT = 4.9;
const INTERVAL = 0.015;

// the highest rank we look for when checking that ranks are continuous
const MAX_RANK_CHECKED = 100000;

async function fetchAllGames(): Promise<Game[]> {

    const games: Game[] = [];

    try {
        // count is computed from an integer step so rounding errors can't build up
        for (let step = 0; 1 + step * INTERVAL < MAX_WEIGHT; step++) {
            const count = 1 + step * INTERVAL;

            const min = (count - INTERVAL).toFixed(3);

            // a slight margin to account for rounding, duplicate board games are removed later on
            const max = (count + INTERVAL / 3).toFixed(3);

            const { type, data } = await getObjects(min, max);
            games.push(...data);
            console.log(`Weight ${min}-${max}: ${data.length} games (${type === "call" ? "from bgg" : "from cache"})`);

            // 10-60 second wait
            const duration = 10000 + Math.random() * 1000 * (Math.random() * 50);
            if (type === "call") {
                console.log(`Waiting ${Math.round(duration / 1000)}s before the next call to bgg`);
                await sleep(duration);
            }
        }
    } finally {
        await closeBrowser();
    }

    return games;
}

// unranked games go to the end
function sortByRank(records: Game[]): void {
    records.sort((a, b) => {
        if (a.rank === b.rank) return 0;
        return (a.rank ?? Infinity) < (b.rank ?? Infinity) ? -1 : 1;
    });
}

function logContinuousRank(records: Game[]): void {
    const ranks = new Set(records.map(x => x.rank));

    for (let i = 1; i < MAX_RANK_CHECKED; i++) {
        if (!ranks.has(i)) {
            console.log("The max bgg rank represented continuously is up to ", i);
            break;
        }
    }
}

export async function getAllWeights(): Promise<void> {

    const games = await fetchAllGames();
    games.push(...CUSTOM_GAMES);

    const mergedRecords = mergeDuplicateRecords(removeUnwantedRecords(games));
    console.log(`Found ${mergedRecords.length} games`);

    sortByRank(mergedRecords);
    logContinuousRank(mergedRecords);

    WEIGHT_PREFERENCES.forEach((bias) => writeRankingsForBias(mergedRecords, bias));
    console.log("Records recorded");
}
