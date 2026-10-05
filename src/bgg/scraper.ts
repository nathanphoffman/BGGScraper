import { mergeDuplicateRecords, writeRankingsForBias } from "../objectBuilder";
import { sleep } from "../utility";
import { CUSTOM_GAMES, EXCLUDED_TITLE_PREFIXES, WEIGHT_PREFERENCES } from "../config";
import { getObjects } from "./parser";
import { closeBrowser } from "./memoizer";
import { Game } from "../types/game";


export async function getAllWeights(): Promise<void> {

    const arr: Game[] = [];
    // weights on bgg range from 1 to 5, but in practice there is no reason a weight should ever be anywhere close to 4.9 or above
    // unless there is an anamoly, which we wouldn't want to pull in anyway
    const INTERVAL = 0.015;

    try {
        // count is computed from an integer step so rounding errors can't build up
        for (let step = 0; 1 + step * INTERVAL < 4.9; step++) {
            const count = 1 + step * INTERVAL;

            const min = (count - INTERVAL).toFixed(3);

            // a slight margin to account for rounding, duplicate board games are removed later on
            const max = (count + INTERVAL / 3).toFixed(3);

            const { type, data } = await getObjects(min, max);
            arr.push(...data);
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

    arr.push(...CUSTOM_GAMES);

    const removedRecords = removeUnwantedRecords(arr);
    const mergedRecords = mergeDuplicateRecords(removedRecords);
    console.log(`Found ${mergedRecords.length} games`);

    // unranked games go to the end
    mergedRecords.sort((a, b) => {
        if (a.rank === b.rank) return 0;
        return (a.rank ?? Infinity) < (b.rank ?? Infinity) ? -1 : 1;
    });
    const ranks = new Set(mergedRecords.map(x => x.rank));

    for (let i = 1; i < 100000; i++) {
        if (!ranks.has(i)) {
            console.log("The max bgg rank represented continuously is up to ", i);
            break;
        }
    }

    WEIGHT_PREFERENCES.forEach((bias) => writeRankingsForBias(mergedRecords, bias));
    console.log("Records recorded");
}

function removeUnwantedRecords(records: Game[]): Game[] {
    return records.filter(x => !EXCLUDED_TITLE_PREFIXES.some(prefix => x.title.toUpperCase().startsWith(prefix)));
}
