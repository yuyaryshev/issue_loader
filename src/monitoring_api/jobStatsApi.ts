import { Env } from "other";
import moment from "moment";
import { debugMsgFactory as debugjs, manageableTimer } from "Ystd";
import { JobContext } from "Yjob/JobContext";

const debug = debugjs("jobStatsApi");
let started = false;

// project, jobType, status, jobsCount, issuesCount, minTs, maxTs
export interface IssueLoaderStatItem {
    project: string;
    jobType: string;
    state: string;
    jobsCount: number;
    minTs: string;
    maxTs: string;
}

let jobStats: IssueLoaderStatItem[] = [];

let refreshTimer: any = undefined;
// http://a123278.moscow.alfaintra.net:29364/api/stats
export async function jobStatsApi(env: Env, req: any, res: any) {
    // @ts-ignore
    const pthis = this;

    const ts = moment().format();
    let error: string | undefined = undefined;
    let ok: boolean = false;
    const { query } = req;

    try {
        if (!refreshTimer)
            refreshTimer = manageableTimer(env, 300, `CODE00000274`, "projectStatsRefreshTimer", () => {
                let newStats = new Map<string, IssueLoaderStatItem>();

                env.jobStorage.iterateJobContexts(undefined, (jobContext: JobContext) => {
                    for (let job of jobContext.jobsArray()) {
                        let k = `${(jobContext as any).project}, ${job.jobType.type}, ${job.state}`;

                        let s = newStats.get(k);
                        if (!s) {
                            newStats.set(
                                k,
                                (s = {
                                    project: (jobContext as any).project,
                                    jobType: job.jobType.type,
                                    state: job.state,
                                    jobsCount: 0,
                                    minTs: jobContext.input.updatedTs,
                                    maxTs: jobContext.input.updatedTs,
                                } as IssueLoaderStatItem)
                            );
                        }
                        s.jobsCount++;
                        (s as any).issueCount = 0; // TODO delete issueCount from here
                        if (s.minTs > jobContext.input.updatedTs) s.minTs = jobContext.input.updatedTs;
                        if (s.maxTs < jobContext.input.updatedTs) s.maxTs = jobContext.input.updatedTs;
                    }
                });

                jobStats = [...newStats.values()];
            });
        refreshTimer.setTimeout();
    } catch (e) {
        error = e.message;
        if (env.debugMode) debug(`CODE00000013 statsApi for ts=${query.ts} - ERROR!`, e);
    }

    return res.send(
        JSON.stringify({
            ok,
            error,
            ts,
            stats: jobStats,
        })
    );
}
