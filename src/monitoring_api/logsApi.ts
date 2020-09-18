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

    try {
        /*
        const fullRefresh = !query.ts || moment().diff(query.ts) > env.jobStorage.statusTTL;
        for (let logItem of env.genericLog.lastItems) {
            if (fullRefresh || !logItem.ts || logItem.ts >= query.ts) logItems.push(logItem);
            logItems.push(logItem);
        }
         */
        if (query.fullLogs == "true") {
            let sql = "select ts, cpl, severity, prefix, message, data from generic_log";
            if (query.filter) {
                sql += " where " + query.filter;
            }
            for (let row of env.jobStorage.db.prepare(sql).iterate()) {
                logItems.push(row);
                if (logItems.length >= 100) break;
            }
        } else {
            for (let i = env.genericLog.lastItems.length - 1; i > -1; i--) {
                //if (fullRefresh || !logItem.ts || logItem.ts >= query.ts) logItems.push(logItem);
                logItems.push(env.genericLog.lastItems[i]);
            }
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
