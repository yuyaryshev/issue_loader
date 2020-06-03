export function fmap<T, R>(array: T[], callback: (item: T, index: number) => R | null | undefined): R[] {
    const r: R[] = [];
    const len = array.length || 0;
    for (let i = 0; i < len; i++) {
        const itemr = callback(array[i], i);
        if (itemr !== undefined && itemr !== null) r.push(itemr);
    }
    return r;
}
