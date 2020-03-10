const ms = 1;
const s = 1000 * ms;
const m = 60 * s;
const h = 60 * m;
const d = 24 * h;

export const jobRetryInterval = (() => {
    const multiplier = 5;
    const inp = [
        //
        300 * ms,
        1 * s,
        5 * s,
        15 * s,
        30 * s,
        1 * m,
        15 * m,
        30 * m,
        1 * h,
        2 * h,
        8 * h,
        1 * d,
        3 * d,
        35 * d,
    ];

    const r: number[] = [inp[0]];
    for (let item of inp) for (let i = 0; i < multiplier; i++) r.push(item);
    return r;
})();

export const retryInterval = (repeatIntevalIndex: number) =>
    jobRetryInterval[repeatIntevalIndex] || jobRetryInterval[jobRetryInterval.length - 1];
