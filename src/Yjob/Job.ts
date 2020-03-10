// import { Database } from "better-sqlite3";
// import { SqliteLog } from "../SqliteLog";
// import { assertNever } from "assert-never";
// import { EnvSettings } from "../Env";
// import { runOnce } from "../runOnce";
import { JobWait } from "./JobWait";
import { JobStep } from "./JobStep";
import { JobType } from "./JobType";
import { JobStorage } from "./JobStorage";
import moment from "moment";
import { ObjectWithCont } from "Ystd";

export type JobId = string;
export type JobKey = string;

export interface JobDependencyItem {
    succeded: boolean;
    id: JobId;
    result: any;
}

export class Job<TEnv = any, TIn = any, TOut = any> implements ObjectWithCont<Job> {
    // GRP_job_readonly_fields - immutable & readonly by Job system fields
    public readonly jobStorage: JobStorage<TEnv>;
    public readonly id: JobId;
    public readonly key: JobKey;
    public readonly parent: JobId | undefined;
    public readonly jobType: JobType;
    public readonly input: TIn;
    public priority?: number;
    public createdTs: moment.Moment;

    // ----------------------  GRP_job_fields ----------------------
    // GRP_job_flow_fields - shouldn't be modified from outside of Job system directly, - use functions to change some of this fields
    cancelled: boolean; // This flag is only used when the job is Running
    running: boolean;
    succeded: boolean;
    paused: boolean;
    deps: Map<JobId, JobDependencyItem>;
    deps_succeded: boolean;
    observers: JobId[];
    prevResult: TOut | undefined;

    // GRP_scheduling
    retryIntervalIndex: number;
    nextRunTs?: moment.Moment;
    // get nextRunTs() {
    //     return this._nextRunTs;
    // }
    // set nextRunTs(v:moment.Moment | undefined) {
    //     if(v) {
    //         console.trace(`CODE00000102 REMOVE_THIS`, v?.format());
    //     }
    //     this._nextRunTs = v;
    // }

    // GRP_job_info_fields - writeonly fields, - job system writes to this fields and writes some them to DB as logs, but it never READS from it in JobCycle
    public startedTs?: moment.Moment;
    public finishedTs?: moment.Moment;
    public waitType: JobWait | undefined;
    public prevError: string | undefined;
    public timesSaved: number;
    // ----------------------  GRP_job_fields END ----------------------

    public unloaded: boolean;
    public touchTs: moment.Moment;
    public jobSteps: JobStep[];
    public currentJobStep: JobStep;
    public container: Job[] | Set<Job> | undefined;

    constructor(
        jobType: JobType,
        jobStorage: JobStorage<TEnv>,
        input: TIn,
        id: string,
        key: string,
        parent: JobId | undefined
    ) {
        // GRP_job_readonly_fields
        this.jobStorage = jobStorage;
        this.id = id;
        this.key = key;
        this.parent = parent;
        this.jobType = jobType;
        this.input = input;
        this.priority = undefined;
        this.createdTs = moment();

        // GRP_job_ready_states
        this.cancelled = false;
        this.running = false;
        this.succeded = false;
        this.paused = false;
        this.deps = new Map();
        this.deps_succeded = true;
        this.observers = [];
        this.prevResult = undefined;

        // GRP_job_scheduling
        this.retryIntervalIndex = 0;
        this.nextRunTs = undefined;

        // GRP_job_info_fields
        this.startedTs = undefined;
        this.finishedTs = undefined;
        this.waitType = undefined;
        this.prevError = undefined;
        this.timesSaved = 0;
        this.jobSteps = [];
        this.currentJobStep = undefined as any;
        this.touchTs = moment();
        this.unloaded = false;
        this.setStep(`CODE00000173`, `Created`, undefined);
    }

    elapsed(unitOfTime: moment.unitOfTime.Diff = "s") {
        return (this.finishedTs || moment()).diff(this.startedTs, unitOfTime);
    }

    setStep(cpl: string, step: string, waitType: JobWait | undefined) {
        const jobStep = { cpl, step, waitType };
        this.jobSteps.push(jobStep);
        this.currentJobStep = jobStep;
        this.jobStorage.onJobStep(this, jobStep);
    }

    save(saveHistory: boolean): Promise<void> {
        return this.jobStorage.saveJob(this, saveHistory);
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
            this.jobStorage.fixJobContainer(this);
        }
    }

    invalidate() {
        this.makeStale();
    }

    touch() {
        this.jobStorage.touch(this);
    }

    unload() {
        return this.jobStorage.unload(this);
    }
}
