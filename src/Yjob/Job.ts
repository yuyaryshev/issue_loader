// import { Database } from "better-sqlite3";
// import { SqliteLog } from "../SqliteLog";
// import { assertNever } from "assert-never";
// import { EnvSettings } from "../Env";
import { JobWait } from "./JobWait";
import { JobStep } from "./JobStep";
import { JobType } from "./JobType";
import { JobStorage } from "./JobStorage";
import moment from "moment";
import { JobContext, JobContextId } from "Yjob/JobContext";
import { JobState } from "Yjob/JobState";
import { EnvWithTimers, Severity } from "Ystd";

export type JobId = number;
export type JobKey = string;

export interface JobDependencyItem {
    succeded: boolean;
    id: JobId;
    jobContextId?: number;
    result: any;
}

export type ObserverItem = JobId | [JobContextId, JobId];

export class Job<TEnv extends EnvWithTimers = any, TContext = any, TIn = any, TOut = any> {
    // GRP_job_readonly_fields - immutable & readonly by Job system fields
    public readonly jobStorage: JobStorage<TEnv>;
    public readonly jobContext: JobContext<TEnv>;
    public readonly jobContextId: JobContextId;
    public readonly id: JobId;
    public readonly key: JobKey;
    public readonly parent: JobId | undefined;
    public readonly jobType: JobType;
    public readonly input: TIn;
    public priority?: number;

    // ----------------------  GRP_job_fields ----------------------
    // GRP_job_flow_fields - shouldn't be modified from outside of Job system directly, - use functions to change some of this fields
    cancelled: boolean; // This flag is only used when the job is Running
    running: boolean;
    succeded: boolean;
    paused: boolean;
    predecessors: Map<JobId, JobDependencyItem>;
    predecessorsDone: boolean;
    successors: ObserverItem[];
    result: TOut | undefined;

    // GRP_scheduling
    retryIntervalIndex: number;
    nextRunTs?: moment.Moment;
    // get nextRunTs() {
    //     return this._nextRunTs;
    // }
    // set nextRunTs(v:moment.Moment | undefined) {
    //     if(v) {
    //         console.trace(`CODE00000301 REMOVE_THIS`, v?.format());
    //     }
    //     this._nextRunTs = v;
    // }

    // GRP_job_info_fields - writeonly fields, - job system writes to this fields and writes some them to DB as logs, but it never READS from it in JobCycle
    public waitType: JobWait | undefined;
    public prevError: string | undefined;
    public timesSaved: number;
    public state: JobState;
    // ----------------------  GRP_job_fields END ----------------------

    public unloaded: boolean;
    public touchTs: moment.Moment;
    public jobSteps: JobStep[];
    public currentJobStep: JobStep;
    public needToLoad: boolean;

    constructor(
        jobType: JobType,
        jobContext: JobContext<TEnv>,
        input: TIn,
        id: number,
        key: string,
        parent: JobId | undefined,
        deserialized: boolean = false
    ) {
        // GRP_job_readonly_fields
        this.jobContext = jobContext;
        this.jobContextId = jobContext.id;
        this.jobStorage = jobContext.jobStorage;
        this.id = id;
        this.key = key;
        this.parent = parent;
        this.jobType = jobType;
        this.input = input;
        this.priority = undefined;

        // GRP_job_ready_states
        this.cancelled = false;
        this.running = false;
        this.succeded = false;
        this.paused = false;
        this.predecessors = new Map();
        this.predecessorsDone = true;
        this.successors = [];
        this.result = undefined;

        // GRP_job_scheduling
        this.retryIntervalIndex = 0;
        this.nextRunTs = undefined;

        // GRP_job_info_fields
        this.waitType = undefined;
        this.prevError = undefined;
        this.timesSaved = 0;
        this.jobSteps = [];
        this.currentJobStep = undefined as any;
        this.touchTs = moment();
        this.unloaded = false;
        if (!deserialized) this.setStep(`CODE00000302`, `Created`, undefined);
        this.state = "readyToRun";
        this.needToLoad = true;
    }

    setStep(cpl: string, step: string, waitType: JobWait | undefined, severity: Severity = "D", finished?: boolean) {
        const jobStep = { cpl, step, waitType, severity, finished } as JobStep;
        this.jobSteps.push(jobStep);
        this.currentJobStep = jobStep;
        this.jobStorage.onJobStep(this, jobStep);
    }

    save(saveHistory: boolean): Promise<void> {
        return this.jobStorage.saveJobContext(this.jobContext, saveHistory);
    }

    startNow() {
        this.jobStorage.startNow(this);
    }

    pause() {
        this.jobStorage.pause(this);
    }

    resume() {
        this.jobStorage.resume(this);
    }

    // Manually makes job not succeded
    makeStale() {
        if (this.running) this.cancelled = true;
        this.succeded = false;
        if (!this.running) {
            this.save(false);
            this.jobStorage.updateJobState(this);
        }
    }

    invalidate() {
        this.makeStale();
    }

    touch() {
        this.jobStorage.touch(this.jobContext);
    }
}

export function jobSequenceCompare(a: Job, b: Job): -1 | 0 | 1 {
    if (a.running > b.running) return -1;

    if (a.running < b.running) return 1;

    if (a.predecessorsDone > b.predecessorsDone) return -1;

    if (a.predecessorsDone < b.predecessorsDone) return 1;

    if (!!a.nextRunTs > !!b.nextRunTs || (a.nextRunTs && b.nextRunTs && a.nextRunTs > b.nextRunTs)) return -1;

    if (!!a.nextRunTs < !!b.nextRunTs || (a.nextRunTs && b.nextRunTs && a.nextRunTs < b.nextRunTs)) return 1;

    if (!a.paused > !b.paused) return -1;

    if (!a.paused < !b.paused) return 1;

    return 0;
}
