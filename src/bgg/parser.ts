import { cleanup } from "../utility";
import { getLinkByWeight } from "./links";
import { memoize } from "./memoizer";
import { Game } from "../types/game";
import * as cheerio from "cheerio";

// unranked games have no number in the rank column
function parseRank(txt: string): number | null {
    const rank = cleanup(txt);
    return rank ? Number(rank) : null;
}

export function getObjects(min: string, max: string): Promise<{ data: (Game | undefined)[]; type: string }> {

    return memoize(getLinkByWeight(min, max))
        .then(function (response) {
            const $ = cheerio.load(response.data);

            const rows = $('table#collectionitems tr').toArray().slice(1);

            const results = rows.map(game => {
                const $game = $(game);
                const title = $game.find('a.primary').first();
                if (title.text()) {
                    const ratings = $game.find('td.collection_bggrating');
                    return {
                        title: title.text(),
                        average: Number(cleanup(ratings.eq(1).text())),
                        weight: (Number(min) + Number(max)) / 2,
                        num: Number(cleanup(ratings.eq(2).text())),
                        rank: parseRank($game.find('td.collection_rank').first().text()),
                        releaseDate: cleanup($game.find('span.smallerfont').first().text() ?? "")
                    } satisfies Game;
                }
            });

            return { data: results, type: response.type };
        });

}
