import { Game } from "./types/game";

export function cleanup(txt: string): string {
    return txt.replace(/[^\d.-]/g, '');
}

export function clean<T>(arr: (T | undefined | null | false)[]): T[] {
    return arr.filter((x): x is T => !!x);
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function getDupIndex(arr: Game[], item: Game, index: number): number {
    let idx = 0;
    for (let element of arr) {
        if (element.title === item.title && element.releaseDate === item.releaseDate && idx !== index) return idx;
        idx++;
    }
    return -1;
}
