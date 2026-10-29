import { mergeDuplicateRecords, removeUnwantedRecords } from "../records";
import { databaseExists, getStaleYears, loadDatabase, saveDatabase, updateDatabase } from "../database";
import { writeRankingsForBias } from "../reports";
import { DAY_MS, sleep } from "../utility";
import { CUSTOM_GAMES, WEIGHT_PREFERENCES } from "../config";
import { getObjects, PageOptions } from "./parser";
import { closeBrowser } from "./memoizer";
import { Game } from "../types/game";

// weights on bgg range from 1 to 5, but in practice there is no reason a weight should ever be anywhere close to 4.9 or above
// unless there is an anamoly, which we wouldn't want to pull in anyway
const MAX_WEIGHT = 4.9;

// a full scrape uses thin weight slices so each game's weight is accurate
const FULL_INTERVAL = 0.015;

// a recent scrape only has a year or two of games, so much wider slices still fit under bgg's 100 results per page
const RECENT_INTERVAL = 0.2;
const RECENT_MAX_AGE_MS = DAY_MS;

// a year is refreshed by the refresh command once its oldest game was pulled more than this many days ago
const STALE_AFTER_DAYS = 90;

// a slice is widened by this much past its top edge to account for rounding, duplicates are removed later on
const SLICE_MARGIN = 0.005;

// bgg returns 100 results per page and we don't paginate, so a full page means games may have been cut off
const PAGE_SIZE = 100;

// the highest rank we look for when checking that ranks are continuous
const MAX_RANK_CHECKED = 100000;

interface ScrapeOptions extends PageOptions {
    interval: number;
}

function countRequests(interval: number): number {
    let requests = 0;
    while (1 + requests * interval < MAX_WEIGHT) requests++;
    return requests;
}

async function fetchGames({ interval, ...years }: ScrapeOptions): Promise<Game[]> {

    const games: Game[] = [];

    // the more requests there are, the longer we wait between them
    const baseWait = countRequests(interval) / 5;

    try {
        // count is computed from an integer step so rounding errors can't build up
        for (let step = 0; 1 + step * interval < MAX_WEIGHT; step++) {
            const count = 1 + step * interval;

            const min = (count - interval).toFixed(3);
            const max = (count + SLICE_MARGIN).toFixed(3);

            const { type, data } = await getObjects(min, max, years);
            games.push(...data);
            console.log(`Weight ${min}-${max}: ${data.length} games (${type === "call" ? "from bgg" : "from cache"})`);
            if (data.length >= PAGE_SIZE) {
                console.log(`Weight ${min}-${max} filled a page, lower-ranked games in it were cut off`);
            }

            // requests / 5 seconds, plus 1-10 seconds
            const duration = (baseWait + 1 + Math.random() * 9) * 1000;
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

// scraped games replace the stored copies of themselves, then the database is saved
function storeGames(database: Map<string, Game>, scraped: Game[]): void {
    updateDatabase(database, mergeDuplicateRecords(removeUnwantedRecords(scraped)));
    saveDatabase(database);
}

function writeRankings(database: Map<string, Game>): void {
    const games = [...database.values(), ...CUSTOM_GAMES];

    const mergedRecords = mergeDuplicateRecords(removeUnwantedRecords(games));
    console.log(`Found ${mergedRecords.length} games`);

    sortByRank(mergedRecords);
    logContinuousRank(mergedRecords);

    WEIGHT_PREFERENCES.forEach((bias) => writeRankingsForBias(mergedRecords, bias));
    console.log("Records recorded");
}

// the first run, or --full, scrapes everything. After that only last year and this year are scraped and merged into the database
export async function getAllWeights(): Promise<void> {

    const full = process.argv.includes('--full') || !databaseExists();
    const database = loadDatabase();

    const scraped = full
        ? await fetchGames({ interval: FULL_INTERVAL })
        : await fetchGames({ interval: RECENT_INTERVAL, startYear: new Date().getFullYear() - 1, maxAgeMs: RECENT_MAX_AGE_MS });

    storeGames(database, scraped);
    writeRankings(database);
}

// re-scrapes one year at a time for every year in the database that has gone stale, saving after each year
export async function refreshStaleYears(): Promise<void> {

    const database = loadDatabase();
    const years = getStaleYears(database, STALE_AFTER_DAYS);
    console.log(years.length ? `Stale years: ${years.join(", ")}` : "No stale years");

    for (const year of years) {
        console.log(`Refreshing ${year}`);
        const scraped = await fetchGames({ interval: RECENT_INTERVAL, startYear: year, endYear: year, maxAgeMs: RECENT_MAX_AGE_MS });
        storeGames(database, scraped);
    }

    if (years.length) {
        writeRankings(database);
    }
}
