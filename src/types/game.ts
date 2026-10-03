export interface Game {
    title: string;
    average: number;
    weight: number;
    num: number;
    rank: number | null;
    releaseDate: string;
    score?: number;
    disagree?: number;
    nateRank?: number;
}
