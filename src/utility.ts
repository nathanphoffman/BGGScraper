// keeps only digits, dots and minus signs, e.g. "Rating: 7.5" -> "7.5"
export function stripNonNumeric(txt: string): string {
    return txt.replace(/[^\d.-]/g, '');
}

// removes undefined, null and false items from a list
export function removeEmpty<T>(arr: (T | undefined | null | false)[]): T[] {
    return arr.filter((x): x is T => !!x);
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

