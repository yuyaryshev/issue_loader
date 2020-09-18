import { EnvWithDbdJiraIssue } from "other";
import { Request, Response } from "express";
import { debugMsgFactory as debugjs } from "Ystd";
import { issuesToJobs } from "../entry_scripts/run_scanForChangedIssueKeys";
import { IssueContextInput } from "../job/IssueContext";
import { jiraClean } from "Yjira";
import { decoderSqlApiRequest, SqlApiRequest } from "./types";

const debug = debugjs("jobPause");

// http://a123278.moscow.alfaintra.net:29364/api/sqlapi
export const errorLogApi = async (env: EnvWithDbdJiraIssue, req: any, res: any) => {
    let ok: boolean = false;
    let error: string | undefined;
    let loadedErrors: any[] = [];
    try {
        const { query } = req;

        for (let row of env.jobStorage.db
            .prepare(
                `select issuekey, prevError from jobContexts where project='${query.project}' and succeded=0 and prevError is not null`
            )
            .iterate()) {
            let modifyeddRow = row;
            if (modifyeddRow.prevError.length > 100) {
                modifyeddRow.prevError = modifyeddRow.prevError.substr(0, 100) + "...";
            }
            loadedErrors.push(modifyeddRow);
            if (query.fullLoad != "1" && loadedErrors.length >= 10) break;
        }
    } catch (e) {
        error = e.message;
        if (env.debugMode) debug(`CODE00000375 errorLogApi - ERROR!`, e);
    }
    return res.send(JSON.stringify({ ok, error, loadedErrors }));
};
