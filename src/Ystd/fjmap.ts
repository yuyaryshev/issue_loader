export function fjmap<T>(
    array: T[],
    sep: string,
    callback: (item: T, index: number) => string | number | undefined | null
) {
    const r: string[] = [];
    const len = array.length || 0;
    for (let i = 0; i < len; i++) {
        const itemr = callback(array[i], i);
        if (itemr !== undefined && itemr !== null && itemr !== "") r.push(itemr + "");
    }
    return r.join(sep);
}
