import { Env, EnvWithDbdJiraIssue } from "other";
import { Request, Response } from "express";
import { debugMsgFactory as debugjs, yconsole } from "Ystd";
import { issuesToJobs } from "../entry_scripts/run_scanForChangedIssueKeys";
import { IssueContextInput } from "../job/IssueContext";
import { jiraClean } from "Yjira";
import { checkPass } from "./checkPass";
import { exportJiraDataToSqlite, importJiraDataFromSqlite } from "../other/importExport";

const debug = debugjs("jobPause");

// http://a123278.moscow.alfaintra.net:29364/api/sqlapi
export async function importApi(env: EnvWithDbdJiraIssue, req: Request, res: Response) {
    let error: string | undefined = undefined;
    let ok: boolean = false;
    const { query } = req;

    if (!checkPass(query)) {
        return res.send(JSON.stringify({ ok: false, error: "Incorrect password!" }));
    }

    try {
        await importJiraDataFromSqlite(env, "export.db"); //import.db
    } catch (e) {
        error = e.message;
        if (env.debugMode) debug(`CODE00000026 importApi - ERROR!`, e);
        return res.send(JSON.stringify({ ok: false, error }));
    }
    return res.send(JSON.stringify({ ok }));
}

// http://a123278.moscow.alfaintra.net:29364/api/sqlapi
export async function exportApi(env: EnvWithDbdJiraIssue, req: Request, res: Response) {
    let error: string | undefined = undefined;
    let ok: boolean = false;
    const { query } = req;

    if (!checkPass(query)) {
        return res.send(JSON.stringify({ ok: false, error: "Incorrect password!" }));
    }

    try {
        await exportJiraDataToSqlite(env, "export.db");
    } catch (e) {
        error = e.message;
        if (env.debugMode) debug(`CODE00000117 importApi - ERROR!`, e);
        return res.send(JSON.stringify({ ok: false, error }));
    }
    return res.send(JSON.stringify({ ok }));
}
