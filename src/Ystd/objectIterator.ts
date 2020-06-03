export function objectIterator(o: any): [string, any][] {
    let r: [string, any][] = [];
    for (let k in o) if (o.hasOwnProperty(k)) r.push([k, o[k]]);
    return r;
}
