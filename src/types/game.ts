export interface Game {
    title: string;
    average: number;
    weight: number;
    num: number;
    rank: number | null;
    releaseDate: string;
    // iso date the game was last pulled from bgg
    pulledAt?: string;
    score?: number;
    disagree?: number;
    newRank?: number;
}
