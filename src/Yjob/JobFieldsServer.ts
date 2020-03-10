import { Job } from "./Job";
import { JobFieldFuncs, JobStorage } from "./JobStorage";

import moment from "moment";
// @ts-ignore
require("moment-countdown");

export const defaultJobFieldFuncs = {
    jobColumnStr:
        "id, parent, key, priority, cancelled, deps_succeded, createdTs, finishedTs, jobType, succeded, startedTs, prevError, retryIntervalIndex, nextRunTs, input, prevResult, paused, timesSaved, updatedTs, deleted",
    jobColumnPlaceholderStr:
        ":id, :parent, :key, :priority, :cancelled, :deps_succeded, :createdTs, :finishedTs, :jobType, :succeded, :startedTs, :prevError, :retryIntervalIndex, :nextRunTs, :input, :prevResult, :paused, :timesSaved, :updatedTs, :deleted",

    serializeJobStatus: function serializeJobStatus(job: Job): DefaultJobStatus {
        return {
            jobType: job.jobType.type,
            id: job.id,
            parent: job.parent,
            key: job.key,
            priority: job.priority,
            cancelled: job.cancelled ? 1 : 0,
            deps_succeded: job.deps_succeded ? 1 : 0,
            createdTs: job.createdTs.format(),
            finishedTs: job.finishedTs ? job.finishedTs.format() : undefined,
            succeded: job.succeded ? 1 : 0,
            startedTs: job.startedTs ? job.startedTs.format() : undefined,
            prevError: job.prevError,
            retryIntervalIndex: job.retryIntervalIndex,
            nextRunTs: job.nextRunTs ? job.nextRunTs.format() : undefined,
            input: (JSON.stringify(job.input) || "(empty)").substr(0, 80),
            prevResult: (JSON.stringify(job.prevResult) || "(empty)").substr(0, 80),
            paused: job.paused ? 1 : 0,
            timesSaved: job.timesSaved,
        };
    },
    serializeJob: function serializeJob(job: Job): DefaultSerializedJob {
        return {
            jobType: job.jobType.type,
            id: job.id,
            parent: job.parent,
            key: job.key,
            priority: job.priority,
            cancelled: job.cancelled ? 1 : 0,
            deps_succeded: job.deps_succeded ? 1 : 0,
            createdTs: job.createdTs.format(),
            finishedTs: job.finishedTs ? job.finishedTs.format() : undefined,
            succeded: job.succeded ? 1 : 0,
            startedTs: job.startedTs ? job.startedTs.format() : undefined,
            prevError: job.prevError,
            retryIntervalIndex: job.retryIntervalIndex,
            nextRunTs: job.nextRunTs ? job.nextRunTs.format() : undefined,
            input: JSON.stringify(job.input),
            prevResult: JSON.stringify(job.prevResult),
            paused: job.paused ? 1 : 0,
            timesSaved: job.timesSaved,
        };
    },
    serializedToArray: function serializedToArray(o: DefaultSerializedJob) {
        return [
            o.id,
            o.parent,
            o.key,
            o.priority,
            o.cancelled,
            o.deps_succeded,
            o.createdTs,
            o.finishedTs,
            o.jobType,
            o.succeded,
            o.startedTs,
            o.prevError,
            o.retryIntervalIndex,
            o.nextRunTs,
            o.input,
            o.prevResult,
            o.paused,
            o.timesSaved,
            o.updatedTs,
            o.deleted,
        ];
    },

    deserializeJob: function deserializeJob<TEnv>(jobStorage: JobStorage<TEnv>, jobRow: any): Job {
        for (let k in jobRow) if (jobRow[k] === null) delete jobRow[k];
        const serialized: DefaultSerializedJob = jobRow;
        serialized.input = serialized.input ? JSON.parse(serialized.input) : undefined;

        const jobType = jobStorage.allJobTypes[serialized.jobType];
        if (!jobType)
            //
            throw new Error(`CODE00000000 jobType=${serialized.jobType} - not found!`);

        // let r_parent: Job | undefined;
        // if (serialized.parent) r_parent = jobStorage.findJobById(env, serialized.parent);

        const r = new Job(jobType, jobStorage, serialized.input, serialized.id, serialized.key, serialized.parent);

        r.priority = serialized.priority;
        r.cancelled = !!serialized.cancelled;
        r.deps_succeded = !!serialized.deps_succeded;
        r.createdTs = moment(serialized.createdTs);
        r.finishedTs = serialized.finishedTs ? moment(serialized.finishedTs) : undefined;
        r.succeded = !!serialized.succeded;
        r.startedTs = serialized.startedTs ? moment(serialized.startedTs) : undefined;
        r.prevError = serialized.prevError;
        r.retryIntervalIndex = serialized.retryIntervalIndex;
        r.nextRunTs = serialized.nextRunTs ? moment(serialized.nextRunTs) : undefined;
        r.prevResult = serialized.prevResult && JSON.parse(serialized.prevResult);
        r.paused = !!serialized.paused;
        r.timesSaved = serialized.timesSaved;
        return r;
    },
};

/* Client class declaraion 
    class JobStatus {
    @observable id: string="";
    @observable parent?: string="";
    @observable key: string="";
    @observable priority?: number=0;
    @observable cancelled: number=0;
    @observable deps_succeded: number=0;
    @observable createdTs: string="";
    @observable finishedTs?: string="";
    @observable jobType: string="";
    @observable succeded: number=0;
    @observable startedTs?: string="";
    @observable prevError?: string="";
    @observable retryIntervalIndex: number=0;
    @observable nextRunTs?: string="";
    @observable input: any=undefined;
    @observable prevResult?: any=undefined;
    @observable paused: number=0;
    @observable timesSaved: number=0;
    @observable updatedTs?: string="";
    @observable deleted?: number=0;        
    };
     */

export interface DefaultJobStatus {
    id: string;
    parent?: string;
    key: string;
    priority?: number;
    cancelled: number;
    deps_succeded: number;
    createdTs: string;
    finishedTs?: string;
    jobType: string;
    succeded: number;
    startedTs?: string;
    prevError?: string;
    retryIntervalIndex: number;
    nextRunTs?: string;
    input: any;
    prevResult?: any;
    paused: number;
    timesSaved: number;
    updatedTs?: string;
    deleted?: number;
}

export interface DefaultSerializedJob {
    id: string;
    parent?: string;
    key: string;
    priority?: number;
    cancelled: number;
    deps_succeded: number;
    createdTs: string;
    finishedTs?: string;
    jobType: string;
    succeded: number;
    startedTs?: string;
    prevError?: string;
    retryIntervalIndex: number;
    nextRunTs?: string;
    input: any;
    prevResult?: any;
    paused: number;
    timesSaved: number;
    updatedTs?: string;
    deleted?: number;
}
