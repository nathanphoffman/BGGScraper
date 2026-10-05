import { Game } from "./types/game";

// the bgg user whose collection is used in the search
export const BGG_USERNAME = 'taloskhaos';

// one output folder is made per weight preference, 0 means no weight preference
export const WEIGHT_PREFERENCES = [0, 1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.1, 2.2, 2.25, 2.3, 2.4, 2.5, 2.6, 2.8, 3, 3.4, 3.5, 3.6, 3.8, 4, 4.5, 5];

// how strongly distance from the preferred weight lowers a score
export const BIAS_BASE = 2;
export const BIAS_MULTIPLIER = 1;

// averages above this are treated as this, so a few very high ratings can't dominate
export const MAX_AVERAGE_RATING = 8.75;

// games whose titles start with any of these are left out of every list
export const EXCLUDED_TITLE_PREFIXES = [
    'UNDAUNTED',
    'UNMATCHED',
    'CLANK!',
    'TICKET TO RIDE',
    'MARVEL',
    'ZOMBICIDE',
    'UNLOCK',
    'DISNEY',
    'CHRONICLES OF CRIME',
    'DICE THRONE',
];

// games added by hand, the weight is an override of bgg's weight
export const CUSTOM_GAMES: Game[] = [
    { title: "Honey Buzz Custom", average: 7.55, weight: 2.5, num: 7676, rank: null, releaseDate: "2020" },
    { title: "Ego Custom", average: 7.22, weight: 2.29, num: 243, rank: null, releaseDate: "2025" },
    { title: "Shadowscape custom", average: 6.2, weight: 2.44, num: 66, rank: null, releaseDate: "2017" },
];
