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

