import { cleanup } from "../utility";
import { getLinkByWeight } from "./links";
import { memoize } from "./memoizer";
import {JSDOM} from "jsdom";

export function getObjects(min, max) {

    return memoize(getLinkByWeight(min, max))
        .then(function (response) {
            const dom = new JSDOM(response.data);

            let nodesArr = [...dom.window.document.querySelectorAll('table#collectionitems tr')];

            // remove header row
            nodesArr.splice(0, 1);

            const results = nodesArr.map(game => {
                if (game) {
                    const title = [...game.querySelectorAll('a.primary')];
                    if (title[0]?.textContent) {

                        const average = [...game.querySelectorAll('td.collection_bggrating')][1];
                        const num_ratings = [...game.querySelectorAll('td.collection_bggrating')][2];
                        const rank = [...game.querySelectorAll('td.collection_rank')][0]; 
                        const releaseDate = [...game.querySelectorAll('span.smallerfont')][0];

                        return {
                            title: title[0].textContent,
                            average: cleanup(average.textContent),
                            weight: (Number(min) + Number(max)) / 2,
                            num: cleanup(num_ratings.textContent),
                            rank: cleanup(rank.textContent),
                            releaseDate: cleanup(releaseDate?.textContent ?? "")
                        }
                    }
                }
            });

            return { data: results, type: response.type };
        });

}