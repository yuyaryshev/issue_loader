import { manageableTimer, sortObjects, yconsole } from "Ystd";
import { JobStorage } from "Yjob/JobStorage";
import moment from "moment";
import { JobContext } from "Yjob/JobContext";

export const jobsRatio = {
    veryLow: 0.1,
    low: 0.7,
    mid: 0.8,
    high: 0.9,
    max: 1,
};

export async function loadUnload(jobStorage: JobStorage<any, any, any, any, any>) {
    const ts = moment();
    const tsStr = ts.format();
    // const VERY_LOW = jobStorage.maxLoadedJobs * jobsRatio.veryLow;
    const LOW = jobStorage.maxContextsInMem * jobsRatio.low;
    const MID = jobStorage.maxContextsInMem * jobsRatio.mid;
    const HIGH = jobStorage.maxContextsInMem * jobsRatio.high;
    const MAX = jobStorage.maxContextsInMem * jobsRatio.max;

    // Load more jobs if some Jobs are unloaded to DB
    if (!jobStorage.nonSuccededAreFullyLoaded) {
        // First we load ReadyToRun JOBCONTEXTS.
        // HINT: We don't care if we have too much JOBCONTEXTS here, because readyToRun JOBCONTEXTS should always take priority
        // if we looad too many here, than we will unload some OTHER tasks below
        if (jobStorage.readyToRunJobContexts.length < LOW) {
            jobStorage.loadJobContexts(
                jobStorage.selectContextsReadyToRunByNextRunTs.iterate(tsStr, MID),
                () => MID <= jobStorage.readyToRunJobContexts.length,
                jobStorage.selectJobsForContext
            );
        }

        if (jobStorage.loadedJobsCount() < LOW) {
            jobStorage.loadJobContexts(
                jobStorage.selectContextsAllNotSucceded.iterate(MID),
                () => jobStorage.loadedJobsCount() <= MID,
                jobStorage.selectJobsForContext
            );
        }

        if (jobStorage.loadedJobsCount() < LOW) jobStorage.nonSuccededAreFullyLoaded = true;
    }

    // We unload JOBCONTEXTS only if we reached MAX
    // But we will unload them until there are less than HIGH JOBCONTEXTS left
    // This is because unloading process is quite heavy and we don't want it to occur every time.
    if (jobStorage.loadedJobsCount() < MAX) return;

    jobStorage.lastUnload = ts;

    if (!jobStorage.unloadStatusReporterTimer)
        jobStorage.unloadStatusReporterTimer = manageableTimer(
            jobStorage.env,
            1000,
            "CODE00000316",
            "unloadStatusReporterTimer",
            () => {
                yconsole.log(
                    `CODE00000315`,
                    `JobContext unloading ${jobStorage.loadedJobsCount()} / ${MAX} JobContexts ${
                        jobStorage.unloading ? " - unloading" : " - FINISHED"
                    }`
                );

                if (jobStorage.unloading) jobStorage.unloadStatusReporterTimer.setTimeout();
            }
        );

    jobStorage.unloading = true;

    jobStorage.unloadStatusReporterTimer!.executeNow();
    jobStorage.unloadStatusReporterTimer!.setTimeout();

    try {
        outer: while (jobStorage.loadedJobsCount() > HIGH) {
            jobStorage.nonSuccededAreFullyLoaded = false;
            let unloadPromises = new Set<Promise<any>>();
            try {
                // prepare context at this time
                let localContextById = new Set(Array.from(jobStorage.jobContextById.keys()));

                // First unload JOBCONTEXTS which are waiting for time and won't be needed for quire a long time
                for (let i of localContextById) {
                    let jobContext = jobStorage.jobContextById.get(i);
                    if (jobContext) {
                        if (
                            !jobContext.disableUnload &&
                            !jobContext.jobStats.readyToRun &&
                            !jobContext.jobStats.running &&
                            jobContext.nextRunTs &&
                            jobContext.nextRunTs.diff(ts) > jobStorage.maxAwaitBeforeUnload &&
                            jobContext.touchTs.diff(ts) > jobStorage.maxAwaitBeforeUnload
                        ) {
                            unloadPromises.add(jobStorage.unload(jobContext));
                            localContextById.delete(i);
                            if (localContextById.size <= HIGH) continue outer;
                        }
                    }
                }

                // Than unload JOBCONTEXTS whose predecessors are not ready and which are not touched for quite long time
                for (let i of localContextById) {
                    let jobContext = jobStorage.jobContextById.get(i);
                    if (jobContext) {
                        if (
                            !jobContext.disableUnload &&
                            !jobContext.jobStats.readyToRun &&
                            !jobContext.jobStats.running &&
                            jobContext.jobStats.waitingDeps &&
                            ts.diff(jobContext.touchTs) > jobStorage.maxAwaitBeforeUnload
                        ) {
                            unloadPromises.add(jobStorage.unload(jobContext));
                            localContextById.delete(i);
                            if (localContextById.size <= HIGH) continue outer;
                        }
                    }
                }

                // If we still have too much JOBCONTEXTS - unload all non-ready to run by touchTs
                {
                    let locArrayContextJobsUnsorted = [];
                    for (let i of localContextById) {
                        let jobContext = jobStorage.jobContextById.get(i);
                        if (jobContext) {
                            locArrayContextJobsUnsorted.push(Object.assign(jobContext, { KeyJC: i }));
                        }
                    }
                    const jobContextsByTouchTs = sortObjects(
                        locArrayContextJobsUnsorted.filter(
                            j => !j.disableUnload && !j.jobStats.running && !j.jobStats.readyToRun
                        ),
                        ["touchTs"]
                    );
                    for (let i = jobContextsByTouchTs.length - 1; i >= 0; i--) {
                        const jobContext = jobContextsByTouchTs[i];
                        unloadPromises.add(jobStorage.unload(jobContext));
                        localContextById.delete(jobContext.KeyJC);
                        if (localContextById.size <= HIGH) continue outer;
                    }
                }

                // Only ready to run JOBCONTEXTS are left, but still too many - unload them starting from back
                {
                    let locArrayContextReadyToRun = [];
                    for (let i of localContextById) {
                        let jobContext = jobStorage.jobContextById.get(i);
                        if (jobContext && jobContext.jobStats.readyToRun > 0) {
                            locArrayContextReadyToRun.push(Object.assign(jobContext, { KeyJC: i }));
                        }
                    }
                    for (let i = locArrayContextReadyToRun.length - 1; i >= 0; i--) {
                        const jobContext = locArrayContextReadyToRun[i];
                        if (!jobContext.disableUnload && jobContext.jobStats.running) continue;
                        unloadPromises.add(jobStorage.unload(jobContext));
                        localContextById.delete(jobContext.KeyJC);
                        // TODO понять почему эта строка останавливат нормальный unload, без этой строки может сложиться ситуация когда нет ни одного контекста, который можно было бы запустить!
                        // if (jobStorage.readyToRunJobContexts.length <= MID) break;
                        if (localContextById.size <= HIGH) continue outer;
                    }
                }
            } finally {
                await Promise.all([...unloadPromises]);
            }

            if (jobStorage.loadedJobsCount() <= HIGH) {
                jobStorage.my_console.warn(
                    `CODE00000291`,
                    `There are still ${jobStorage.loadedJobsCount()} tasks left. Restarting unloading process!`
                );
            }
        }
    } finally {
        jobStorage.unloading = false;
    }
}
