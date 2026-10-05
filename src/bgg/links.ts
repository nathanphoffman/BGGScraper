import { BGG_USERNAME } from "../config";

export function getLinkByWeight(min_weight: string, max_weight: string): string {
    // every field of bgg's advanced search form is sent, even empty ones, so the url matches what is already in the cache
    const params = new URLSearchParams([
        ['sort', 'rank'],
        ['advsearch', '1'],
        ['q', ''],
        ['include[designerid]', ''],
        ['include[publisherid]', ''],
        ['geekitemname', ''],
        ['range[yearpublished][min]', ''],
        ['range[yearpublished][max]', ''],
        ['range[minage][max]', ''],
        ['range[numvoters][min]', ''],
        ['range[numweights][min]', ''],
        ['range[minplayers][max]', ''],
        ['range[maxplayers][min]', ''],
        ['range[leastplaytime][min]', ''],
        ['range[playtime][max]', ''],
        ['floatrange[avgrating][min]', ''],
        ['floatrange[avgrating][max]', ''],
        ['floatrange[avgweight][min]', min_weight],
        ['floatrange[avgweight][max]', max_weight],
        ['colfiltertype', ''],
        ['searchuser', BGG_USERNAME],
        ['nosubtypes[0]', 'boardgameexpansion'],
        ['playerrangetype', 'normal'],
        ['B1', 'Submit'],
    ]);
    return `https://boardgamegeek.com/search/boardgame?${params}`;
}
