import { Env } from "other";
import { Request, Response } from "express";
import debugjs from "debug";
const debug = debugjs("jobPause");

// http://a123278.moscow.alfaintra.net:29364/api/jobResumeApi
export const jobResumeApi = async (env: Env, req: Request, res: Response) => {
    let error: string | undefined = undefined;
    let ok: boolean = false;
    const { query } = req;
    try {
        const job = await env.jobStorage.findJobById(query.jobId);
        if (!job) error = `CODE00000211 Job id ${query.jobId} - not found!`;
        else {
            await job.resume();
            ok = true;
            if (env.debugMode) debug(`CODE00000213 jobResumeApi for jobId=${query.jobId} - OK!`);
        }
    } catch (e) {
        error = e.message;
        if (env.debugMode) debug(`CODE00000187 jobResumeApi for jobId=${query.jobId} - ERROR!`, e);
    }
    return res.send(JSON.stringify({ ok, error }));
};
