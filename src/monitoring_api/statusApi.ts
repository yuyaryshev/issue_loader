import { Env } from "other";
import moment from "moment";
import debugjs from "debug";
import { sortObjects } from "Ystd";

const debug = debugjs("jobStatusApi");

// http://a123278.moscow.alfaintra.net:29364/api/status
export const statusApi = async (env: Env, req: any, res: any) => {
    const ts = moment().format();
    let error: string | undefined = undefined;
    let ok: boolean = false;
    const { query } = req;
    const jobStatuses = [];
    const logItems = [];
    const fullRefresh = !query.ts || moment().diff(query.ts) > env.jobStorage.statusTTL;
    try {
        env.jobStorage.refreshJobsStatus();
        for (let [, jobStatus] of env.jobStorage.jobsStatus) {
            if (fullRefresh || !jobStatus.updatedTs || jobStatus.updatedTs >= query.ts) jobStatuses.push(jobStatus);
        }

        for (let logItem of env.genericLog.lastItems) {
            if (fullRefresh || !logItem.ts || logItem.ts >= query.ts) logItems.push(logItem);
        }
    } catch (e) {
        error = e.message;
        if (env.debugMode) debug(`CODE00000125 statusApi for ts=${query.ts} - ERROR!`, e);
    }

    return res.send(
        JSON.stringify({
            ok,
            error,
            ts,
            fullRefresh,
            instanceName: env.settings.instanceName,
            versionStr: env.versionStr,
            jobs: jobStatuses,
            logs: logItems,
        })
    );
};
