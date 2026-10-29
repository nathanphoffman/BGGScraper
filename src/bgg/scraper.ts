import { mergeDuplicateRecords, removeUnwantedRecords } from "../records";
import { databaseExists, getStaleYears, loadDatabase, saveDatabase, updateDatabase } from "../database";
import { writeAllRankings } from "../reports";
import { DAY_MS, sleep } from "../utility";
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

// a recent scrape starts this many years before the current year, so games from late last year keep getting updated
const RECENT_YEARS_BACK = 1;

// a year is refreshed by the refresh command once its oldest game was pulled more than this many days ago
const STALE_AFTER_DAYS = 90;

// a slice is widened by this much past its top edge to account for rounding, duplicates are removed later on
const SLICE_MARGIN = 0.005;

// bgg returns 100 results per page and we don't paginate, so a full page means games may have been cut off
const PAGE_SIZE = 100;

interface ScrapeOptions extends PageOptions {
    interval: number;
}

interface WeightSlice {
    min: string;
    max: string;
}

function getWeightSlices(interval: number): WeightSlice[] {
    const slices: WeightSlice[] = [];

    // count is computed from an integer step so rounding errors can't build up
    for (let step = 0; 1 + step * interval < MAX_WEIGHT; step++) {
        const count = 1 + step * interval;
        slices.push({
            min: (count - interval).toFixed(3),
            max: (count + SLICE_MARGIN).toFixed(3),
        });
    }

    return slices;
}

// the more requests there are, the longer we wait between them: requests / 5 seconds, plus 1-10 seconds
function getWaitMs(requests: number): number {
    return (requests / 5 + 1 + Math.random() * 9) * 1000;
}

async function fetchGames({ interval, ...years }: ScrapeOptions): Promise<Game[]> {

    const games: Game[] = [];
    const slices = getWeightSlices(interval);

    try {
        for (const { min, max } of slices) {
            const { type, data } = await getObjects(min, max, years);
            games.push(...data);
            console.log(`Weight ${min}-${max}: ${data.length} games (${type === "call" ? "from bgg" : "from cache"})`);
            if (data.length >= PAGE_SIZE) {
                console.log(`Weight ${min}-${max} filled a page, lower-ranked games in it were cut off`);
            }

            if (type === "call") {
                const duration = getWaitMs(slices.length);
                console.log(`Waiting ${Math.round(duration / 1000)}s before the next call to bgg`);
                await sleep(duration);
            }
        }
    } finally {
        await closeBrowser();
    }

    return games;
}

// scraped games replace the stored copies of themselves, then the database is saved
function storeGames(database: Map<string, Game>, scraped: Game[]): void {
    updateDatabase(database, mergeDuplicateRecords(removeUnwantedRecords(scraped)));
    saveDatabase(database);
}

// the first run, or --full, scrapes everything. After that only the recent years are scraped and merged into the database
export async function getAllWeights(): Promise<void> {

    const full = process.argv.includes('--full') || !databaseExists();
    const database = loadDatabase();

    const scraped = full
        ? await fetchGames({ interval: FULL_INTERVAL })
        : await fetchGames({ interval: RECENT_INTERVAL, startYear: new Date().getFullYear() - RECENT_YEARS_BACK, maxAgeMs: RECENT_MAX_AGE_MS });

    storeGames(database, scraped);
    writeAllRankings(database);
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
        writeAllRankings(database);
    }
}
