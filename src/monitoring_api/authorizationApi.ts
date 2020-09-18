import { Env } from "other";
import moment from "moment";
import { debugMsgFactory as debugjs } from "Ystd";
import { JobStatus } from "../job/JobFieldsServer";

const debug = debugjs("jobsApi");

// http://a123278.moscow.alfaintra.net:29364/api/issues
export const authorizationApi = async (env: Env, req: any, res: any) => {
    const ts = moment().format();
    let error: string | undefined = undefined;
    let ok: boolean = false;
    const { query } = req;
    const issues: JobStatus[] = []; // TODO JobStatus уже устарел - поменять на Issue
    let admitted = false;
    //const fullRefresh = !query.ts || moment().diff(query.ts) > env.jobStorage.statusTTL;

    try {
        admitted = query.pass == env.password;
    } catch (e) {
        error = e.message;
        //if (env.debugMode) debug(`CODE00000113 IssuessApi for ts=${query.ts} - ERROR!`, e);
    }

    return res.send(
        JSON.stringify({
            ok,
            error,
            admitted,
        })
    );
};
