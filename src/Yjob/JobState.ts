export interface JobStats {
    unloaded: number;
    paused: number;
    running: number;
    waitingTime: number;
    waitingDeps: number;
    readyToRun: number;
    succeded: number;
}

export function makeJobStats() {
    return {
        unloaded: 0,
        paused: 0,
        running: 0,
        waitingTime: 0,
        waitingDeps: 0,
        readyToRun: 0,
        succeded: 0,
    };
}

export const jobStateToNum: { [key: string]: number } = {
    unloaded: 0,
    paused: 1,
    waitingTime: 2,
    waitingDeps: 3,
    readyToRun: 4,
    running: 5,
    succeded: 6,
};

export const jobStateFromNum: JobState[] = (() => {
    const r: JobState[] = [];
    for (let k in jobStateToNum) {
        let index = (jobStateToNum as any)[k];
        if (typeof index === "number") r[index] = k as any;
    }
    return r;
})();

export function newJobStats(): JobStats {
    let r: any = {};
    for (let k in jobStateToNum) r[k] = 0;
    return r;
}

export function addJobStats(target: JobStats, source: JobStats) {
    // @ts-ignore
    for (let k in source) target[k] = (target[k] || 0) + source[k];
    return target;
}

export type JobState = keyof JobStats;
