import { Env } from "other";
import { Request, Response } from "express";
import debugjs from "debug";
const debug = debugjs("jobPause");

// http://a123278.moscow.alfaintra.net:29364/api/jobResumeApi
export const jobPauseApi = async (env: Env, req: Request, res: Response) => {
    let error: string | undefined = undefined;
    let ok: boolean = false;
    const { query } = req;
    try {
        const job = await env.jobStorage.findJobById(query.jobId);
        if (!job) error = `CODE00000012 Job id ${query.jobId} - not found!`;
        else {
            await job.pause();
            ok = true;
            if (env.debugMode) debug(`CODE00000020 jobPauseApi for jobId=${query.jobId} - OK!`);
        }
    } catch (e) {
        error = e.message;
        if (env.debugMode) debug(`CODE00000281 jobPauseApi for jobId=${query.jobId} - ERROR!`, e);
    }
    return res.send(JSON.stringify({ ok, error }));
};
