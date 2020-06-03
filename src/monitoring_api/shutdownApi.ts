import { EnvWithDbdJiraIssue } from "other";
import { Request, Response } from "express";
import { debugMsgFactory as debugjs, yconsole } from "Ystd";
import { issuesToJobs } from "../entry_scripts/run_scanForChangedIssueKeys";
import { IssueContextInput } from "../job/IssueContext";
import { jiraClean } from "Yjira";
import { checkPass } from "./checkPass";

const debug = debugjs("jobPause");

// http://a123278.moscow.alfaintra.net:29364/api/sqlapi
export async function shutdownApi(env: EnvWithDbdJiraIssue, req: Request, res: Response) {
    let error: string | undefined = undefined;
    let ok: boolean = false;
    const { query } = req;

    if (!checkPass(query)) {
        return res.send(JSON.stringify({ ok: false, error: "Incorrect password!" }));
    }

    try {
        env.terminate(false);
    } catch (e) {
        error = e.message;
        if (env.debugMode) debug(`CODE00000208 runIssuesApi - ERROR!`, e);
        return res.send(JSON.stringify({ ok: false, error }));
    }
    return res.send(JSON.stringify({ ok }));
}
