import { EnvWithDbdJiraIssue } from "other";
import { Request, Response } from "express";
import { debugMsgFactory as debugjs } from "Ystd";
import { issuesToJobs } from "../entry_scripts/run_scanForChangedIssueKeys";
import { IssueContextInput } from "../job/IssueContext";
import { jiraClean } from "Yjira";
import { decoderSqlApiRequest, SqlApiRequest } from "./types";

const debug = debugjs("jobPause");

// http://a123278.moscow.alfaintra.net:29364/api/sqlapi
export const SQLApi = async (env: EnvWithDbdJiraIssue, req: Request, res: Response) => {
    let ok: boolean = false;
    let error: string | undefined;
    let JSONtable: object[] = [];
    try {
        if (req.query?.pass != env.password) {
            return res.send(JSON.stringify({ ok: false, error: "Incorrect password!" }));
        }

        (req.query.limit_rows as any) = req.query.limit_rows ? Number.parseInt(req.query.limit_rows as any) : 0;
        const query = decoderSqlApiRequest.runWithException(req.query);

        if (query.sql.trim().toLowerCase().startsWith("select")) {
            for (let row of env.jobStorage.db.prepare(query.sql).iterate()) {
                JSONtable.push(row);
                if (JSONtable.length >= (query.limit_rows || 100)) break;
            }
        } else {
            env.jobStorage.db.exec(query.sql);
        }
        if (JSONtable.length == 0) JSONtable = [{}];
    } catch (e) {
        error = e.message;
        if (env.debugMode) debug(`CODE00000226 runIssuesApi - ERROR!`, e);
    }
    return res.send(JSON.stringify({ ok, error, JSONtable }));
};
