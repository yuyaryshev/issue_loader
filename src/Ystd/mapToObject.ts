export function mapToObject<K extends string, V>(m: Map<K, V>): { [key: string]: V } {
    const r = {} as any;
    for (let [k, v] of m) r[k] = v;
    return r;
}
