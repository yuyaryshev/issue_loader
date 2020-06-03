import { Env } from "other";
import moment from "moment";
import { debugMsgFactory as debugjs } from "Ystd";

const debug = debugjs("logsApi");

// http://a123278.moscow.alfaintra.net:29364/api/logs
export const logsApi = async (env: Env, req: any, res: any) => {
    const ts = moment().format();
    let error: string | undefined = undefined;
    let ok: boolean = false;
    const { query } = req;
    const jobStatuses = [];
    const logItems = [];
    const fullRefresh = !query.ts || moment().diff(query.ts) > env.jobStorage.statusTTL;

    try {
        for (let logItem of env.genericLog.lastItems) {
            if (fullRefresh || !logItem.ts || logItem.ts >= query.ts) logItems.push(logItem);
        }
    } catch (e) {
        error = e.message;
        if (env.debugMode) debug(`CODE00000211 logsApi for ts=${query.ts} - ERROR!`, e);
    }

    return res.send(
        JSON.stringify({
            ok,
            error,
            ts,
            logs: logItems,
        })
    );
};
