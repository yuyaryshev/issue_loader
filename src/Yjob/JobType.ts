import { awaitDelay, ReversePromise, reversePromiseResolveItem } from "Ystd";
import { Job } from "./Job";
import { JobStorage } from "./JobStorage";
import { makeJobKey } from "./makeJobKey";
import { JobUnloadException } from "./JobUnloadException";
import uuid from "uuid";
import { runJob } from "./JobLifeCycle";

export type JobFunc<TEnv, TIn, TOut> = (env: TEnv, job: Job<TIn, TOut>, input: TIn) => TOut | Promise<TOut>;

export interface JobTypeInput<TEnv, TIn, TOut> {
    cpl: string;
    type: string;
    stored: boolean;
    maxRunningTasks?: number;
    func: JobFunc<TEnv, TIn, TOut>;
}

export enum JobTypesEnum {
    writeIssueToDb = "writeIssueToDb",
    transformIssue = "transformIssue",
    jiraIssue = "jiraIssue",
    jiraWorklog = "jiraWorklog",
    jiraComments = "jiraComments",
}

export class JobType<TEnv = any, TIn = any, TOut = any> implements JobTypeInput<TEnv, TIn, TOut> {
    cpl: string;
    type: string;
    stored: boolean;
    maxRunningTasks: number;
    func: JobFunc<TEnv, TIn, TOut>;

    constructor(input: JobTypeInput<TEnv, TIn, TOut>) {
        this.cpl = input.cpl;
        this.type = input.type;
        this.maxRunningTasks = input.maxRunningTasks || Infinity;
        if (!this.cpl || !this.cpl.length) throw new Error(`CODE00000200 Can't create JobType without cpl!`);
        if (!this.type || !this.type.length)
            throw new Error(`CODE00000126 Can't create JobType type === undefined or empty !`);

        this.stored = !!input.stored;
        this.func = input.func;
    }

    run(
        jobStorage: JobStorage<TEnv>,
        parent: Job | undefined,
        input: TIn,
        forceStale?: boolean,
        extendedFields?: any,
        creationReversePromise?: ReversePromise
    ): Promise<TOut | JobUnloadException> | TOut | JobUnloadException {
        const key = makeJobKey(this, input);

        // Try to find job result in parent's context
        if (parent) {
            const depItem = parent.deps.get(key);
            if (depItem?.succeded) {
                return depItem.result;
            }
        }

        // Not found in context, search in JobStorage or create a new job
        let id = uuid();
        let job: Job = jobStorage.findJobByKey(this, key)!;
        if (!job) {
            job = new Job<TEnv, TIn, TOut>(this, jobStorage, input, id, key, parent?.id);
            for (let handler of job.jobStorage.onJobCreatedHandlers) handler(job, "CODE00000234");
        }
        if (extendedFields)
            for (let fieldKey in extendedFields)
                if (extendedFields.hasOwnProperty(fieldKey) && (job as any)[fieldKey] !== extendedFields[fieldKey])
                    (job as any)[fieldKey] = extendedFields[fieldKey];

        if (forceStale) job.makeStale();

        reversePromiseResolveItem(creationReversePromise);

        // Function ending - save job result into parent's context and return the result
        const tailFunc = () => {
            if (parent) {
                parent.deps.set(job.key, {
                    id: job.id,
                    succeded: job.succeded,
                    result: job.prevResult,
                });
                return job.prevResult;
            }

            return job.prevResult;
        };

        // If the job is finished - return result immediatly
        if (job.succeded) return tailFunc();

        // Job isn't finished yet. Async mode...
        return (async function awaitRunJob() {
            if (!job.running) runJob(job); // NO AWAIT HERE! Await is below implemented with await awaitDelay & while!

            if (jobStorage.maxAwaitBeforeUnload <= 0) return new JobUnloadException("CODE00000253");

            // Wait for a while for job to finish without unloading it
            // Later unload the job if waiting for too long (jobStorage.maxAwaitBeforeUnload)
            let totalAwaitTime = 0;

            let delay = 10;
            while (totalAwaitTime < 50) {
                totalAwaitTime += delay;
                if (job.unloaded || totalAwaitTime >= jobStorage.maxAwaitBeforeUnload)
                    return new JobUnloadException("CODE00000254");
                await awaitDelay(delay);
                if (job.succeded) return tailFunc();
            }

            delay = 30;
            while (totalAwaitTime < 500) {
                totalAwaitTime += delay;
                if (job.unloaded || totalAwaitTime >= jobStorage.maxAwaitBeforeUnload)
                    return new JobUnloadException("CODE00000255");
                await awaitDelay(delay);
                if (job.succeded) return tailFunc();
            }

            delay = 100;
            while (totalAwaitTime < 5000) {
                totalAwaitTime += delay;
                if (job.unloaded || totalAwaitTime >= jobStorage.maxAwaitBeforeUnload)
                    return new JobUnloadException("CODE00000099");
                await awaitDelay(delay);
                if (job.succeded) return tailFunc();
            }

            delay = 300;
            while (true) {
                totalAwaitTime += delay;
                if (job.unloaded || totalAwaitTime >= jobStorage.maxAwaitBeforeUnload)
                    return new JobUnloadException("CODE00000100");
                await awaitDelay(delay);
                if (job.succeded) return tailFunc();
            }
        })();
    }

    invalidate(jobStorage: JobStorage<TEnv>, input: TIn) {
        const key = makeJobKey(this, input);
        const job = jobStorage.findJobByKey(this, key);
        if (job) jobStorage.removeJob(job);
    }
}

export async function throwUnload<T>(promise: Promise<T | JobUnloadException> | T | JobUnloadException) {
    const r = await promise;
    if (r instanceof JobUnloadException) throw r;
    return r;
}
