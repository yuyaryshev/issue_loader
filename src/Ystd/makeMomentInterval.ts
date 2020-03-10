import moment, { Duration } from "moment";

export function makeMomentInterval(vv: string): Duration {
    let d: Duration = moment.duration(0);
    for (let v of vv.split(" ")) {
        let r = v.match(/[0-9]+|[^0-9]+/gi)?.map(a => a.trim()) || [Number(v), "ms"];
        if (r.length > 2) throw new Error(`Incorrect interval '${v}'`);
        d.add(moment.duration(Number(r[0]), r[1] as any));
    }
    return d;
}

export function makeMomentIntervals(vv: string): Duration[] {
    let r: Duration[] = [];
    for (let v of vv.split(",")) r.push(makeMomentInterval(v));
    return r;
}
