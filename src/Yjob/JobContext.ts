// import { Database } from "better-sqlite3";
// import { SqliteLog } from "../SqliteLog";
// import { assertNever } from "assert-never";
// import { EnvSettings } from "../Env";
import { JobStorage } from "./JobStorage";
import moment from "moment";
import { EnvWithTimers, ObjectWithCont } from "Ystd";
import { JobContextType } from "Yjob/JobContextType";
import { Job, JobDependencyItem, JobId, JobKey, jobSequenceCompare } from "./Job";
import {
    DefaultJobContextStatus,
    DefaultJobStatus,
    DefaultSerializedJob,
    DefaultSerializedJobContext,
} from "Yjob/JobFieldsServer";
import { JobState, jobStateToNum, JobStats, makeJobStats } from "Yjob/JobState";

export type JobContextId = number;
export type JobContextKey = string;

export interface ContextExtDeps {
    [key: string]: JobDependencyItem;
}

export interface JobContextRow<
    TEnv extends EnvWithTimers = any,
    TContextIn = any,
    TSerializedJobContext extends DefaultSerializedJobContext = DefaultSerializedJobContext,
    TJobContextStatus extends DefaultJobContextStatus = DefaultJobContextStatus,
    TSerializedJob extends DefaultSerializedJob = DefaultSerializedJob,
    TJobStatus extends DefaultJobStatus = DefaultJobStatus
> {
    row: true;
    jobStorage: JobStorage<TEnv, TSerializedJobContext, TJobContextStatus, TSerializedJob, TJobStatus>;
    id: JobContextId;
    key: JobContextKey;
    jobContextType: JobContextType;
    priority?: number;

    running: false;
    succeded: boolean;
    predecessorsDone: boolean;
    paused: boolean;

    retryIntervalIndex: number;
    nextRunTs?: moment.Moment;
    state: JobState;
    stage: string;

    prevError: string | undefined;
    timesSaved: number;

    unloaded: true;
    touchTs: undefined;
}

// <TEnv, TContextIn, TSerializedJobContext, TJobContextStatus, TSerializedJob, TJobStatus>
export class JobContext<
    TEnv extends EnvWithTimers = any,
    TContextIn = any,
    TSerializedJobContext extends DefaultSerializedJobContext = DefaultSerializedJobContext,
    TJobContextStatus extends DefaultJobContextStatus = DefaultJobContextStatus,
    TSerializedJob extends DefaultSerializedJob = DefaultSerializedJob,
    TJobStatus extends DefaultJobStatus = DefaultJobStatus
> implements ObjectWithCont<JobContext> {
    // GRP_job_readonly_fields - immutable & readonly by Job system fields
    public readonly jobStorage: JobStorage<TEnv, TSerializedJobContext, TJobContextStatus, TSerializedJob, TJobStatus>;
    public readonly id: JobContextId;
    public readonly key: JobContextKey;
    public readonly jobContextType: JobContextType;
    public readonly input: TContextIn;
    public priority?: number;
    public jobStats: JobStats;
    public jobSequence: Job[];
    public disableUnload: number = 0;

    public jobsById: { [key: string]: Job }; // JobId -> Job
    //public jobsByKey: { [key: string]: Job }; // JobKey -> Job
    public externalDeps: ContextExtDeps;
    public newIssue: number;

    // ------- Пересмотреть поля ниже. Вероятно часть удалить -------
    // ----------------------  GRP_job_fields ----------------------
    // GRP_job_flow_fields - shouldn't be modified from outside of Job system directly, - use functions to change some of this fields
    running: boolean;
    succeded: boolean;
    predecessorsDone: boolean;
    paused: boolean;

    // GRP_scheduling
    retryIntervalIndex: number;
    nextRunTs?: moment.Moment;
    state: JobState;
    stage: string;
    // get nextRunTs() {
    //     return this._nextRunTs;
    // }
    // set nextRunTs(v:moment.Moment | undefined) {
    //     if(v) {
    //         console.trace(`CODE00000059 REMOVE_THIS`, v?.format());
    //     }
    //     this._nextRunTs = v;
    // }

    // GRP_job_info_fields - writeonly fields, - job system writes to this fields and writes some them to DB as logs, but it never READS from it in JobCycle
    public currentJob: Job | undefined;
    public prevError: string | undefined;
    public timesSaved: number;
    //    public updatedTs?: moment.Moment;
    // ----------------------  GRP_job_fields END ----------------------

    public unloaded: boolean;
    public touchTs: moment.Moment;
    public container: JobContext[] | Set<JobContext> | undefined;

    constructor(
        jobContextType: JobContextType,
        jobStorage: JobStorage<TEnv, TSerializedJobContext, TJobContextStatus, TSerializedJob, TJobStatus>,
        input: TContextIn,
        id: number,
        key: string,
        newIssue: number
    ) {
        // GRP_job_readonly_fields
        this.jobStorage = jobStorage;
        this.id = id;
        this.key = key;
        this.jobContextType = jobContextType;
        this.input = input;
        this.priority = undefined;
        this.jobsById = {};
        this.externalDeps = {};
        this.stage = "";
        this.newIssue = newIssue;

        // GRP_job_ready_states
        this.running = false;
        this.succeded = false;
        this.paused = false;
        this.predecessorsDone = true;
        //this.successors = [];

        // GRP_job_scheduling
        this.retryIntervalIndex = 0;
        this.nextRunTs = undefined;

        // GRP_job_info_fields
        this.prevError = undefined;
        this.timesSaved = 0;
        this.currentJob = undefined;
        this.touchTs = moment();
        this.unloaded = false;
        this.jobStats = makeJobStats();
        this.state = "succeded";
        this.jobSequence = [];
        jobStorage.jobContextById.set(this.id, this as any);
        jobStorage.jobContextByKey.set(this.key, this as any);
    }

    save(saveHistory: boolean): Promise<void> {
        return this.jobStorage.saveJobContext((this as any) as JobContext<any>, saveHistory);
    }

    touch() {
        this.jobStorage.touch((this as any) as JobContext<any>);
    }

    unload() {
        return this.jobStorage.unload((this as any) as JobContext<any>);
    }

    externalDeps_get(jobKey: JobKey): JobDependencyItem {
        return this.externalDeps[jobKey];
    }

    externalDeps_set(jobKey: JobKey, v: JobDependencyItem) {
        this.externalDeps[jobKey] = v;
    }

    jobsArray() {
        return Object.values(this.jobsById);
    }

    getJobById(jobId: JobId) {
        return this.jobsById[jobId];
    }

    getJobByKey(jobKey: JobKey) {
        //return this.jobsByKey[c];
        for (let i in this.jobsById) if (this.jobsById[i].key === jobKey) return this.jobsById[i];
        return undefined;
    }

    addJob(job: Job) {
        if (!job) throw new Error(`CODE00000118 Job can't be undefined!`);
        //return this.jobsByKey[c];
        this.jobsById[job.id] = job;
        this.jobStats[job.state]++;
        this.jobStorage.jobStats[job.state]++;
        this.refreshState();
    }

    refreshState() {
        const jobsArray = this.jobsArray();
        this.jobSequence = jobsArray.filter((job) => !job.succeded);
        this.jobSequence.sort(jobSequenceCompare);
        this.currentJob = this.jobSequence[0];

        const job0 = jobsArray[0] || {};
        let stateNum = jobStateToNum["succeded"];

        let newNextRunTs = undefined;
        //let new_predecessorsDone = true;
        let newSucceded: boolean = true;
        let newPrevError: any = undefined;
        let newRetryIntervalIndex: number = 0;
        let newStage = "99_succeded";
        let newRunning = job0.running;
        let newPaused = job0.paused;

        for (let job of jobsArray) {
            newRunning = newRunning || job.running;
            newPaused = newPaused || job.paused;

            //if (!job.predecessorsDone) new_predecessorsDone = false;

            if (job.nextRunTs && (!newNextRunTs || job.nextRunTs.diff(newNextRunTs) < 0)) newNextRunTs = job.nextRunTs;

            if (!job.succeded) newSucceded = false;
            if (job.prevError) newPrevError = job.prevError;

            if (job.retryIntervalIndex && (!newRetryIntervalIndex || job.retryIntervalIndex < newRetryIntervalIndex))
                newRetryIntervalIndex = job.retryIntervalIndex;

            if (!job.succeded && job.jobType.stage < newStage) newStage = job.jobType.stage;
        }
        this.retryIntervalIndex = newRetryIntervalIndex;
        this.nextRunTs = newNextRunTs;
        this.state = this.currentJob?.state || "succeded";
        //this.predecessorsDone = new_predecessorsDone;
        // @ts-ignore
        if (newSucceded || newPrevError) this.jobStorage.saveJobContext(this, true);
        this.succeded = newSucceded;
        this.prevError = newPrevError;
        this.stage = newStage;
        this.running = newRunning;
        this.paused = newPaused;
        this.jobStorage.saveJobContextMem(this as any);
    }

    hasReadyToRun() {
        return this.jobStats.readyToRun > 0;
    }

    hasWaitingTimeJobs() {
        return this.jobStats.waitingTime > 0;
    }
}
