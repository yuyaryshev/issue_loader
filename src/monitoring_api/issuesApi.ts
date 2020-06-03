import { Env } from "other";
import moment from "moment";
import { debugMsgFactory as debugjs } from "Ystd";
import { JobStatus } from "../job/JobFieldsServer";

const debug = debugjs("jobsApi");

// http://a123278.moscow.alfaintra.net:29364/api/issues
export const issuesApi = async (env: Env, req: any, res: any) => {
    const ts = moment().format();
    let error: string | undefined = undefined;
    let ok: boolean = false;
    const { query } = req;
    const issues: JobStatus[] = []; // TODO JobStatus уже устарел - поменять на Issue
    //const fullRefresh = !query.ts || moment().diff(query.ts) > env.jobStorage.statusTTL;

    try {
        env.jobStorage.refreshJobsStatus();

        let filtVal = query.filter ? query.filter : "1=1";
        let sqlPrepare = env.jobStorage.db.prepare(`select * from jobContexts where ` + filtVal + " limit 20");

        let sqlData = sqlPrepare.all();

        for (let issue of sqlData) {
            issues.push(issue);
        }
    } catch (e) {
        error = e.message;
        if (env.debugMode) debug(`CODE00000113 IssuessApi for ts=${query.ts} - ERROR!`, e);
    }

    return res.send(
        JSON.stringify({
            ok,
            error,
            ts,
            issues,
        })
    );
};
