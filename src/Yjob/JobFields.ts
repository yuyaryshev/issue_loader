import { Job } from "./Job";
import { JobStorage } from "./JobStorage";
import moment from "moment";
// @ts-ignore
require("moment-countdown");

export const jobColumnStr =
    "id, parent, key, priority, cancelled, deps_succeded, createdTs, finishedTs, jobType, succeded, startedTs, prevError, retryIntervalIndex, nextRunTs, input, prevResult, paused, timesSaved, updatedTs, deleted";
export const jobColumnPlaceholderStr = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";

/*
    @observable id;
    @observable parent;
    @observable key;
    @observable priority;
    @observable cancelled;
    @observable deps_succeded;
    @observable createdTs;
    @observable finishedTs;
    @observable jobType;
    @observable succeded;
    @observable startedTs;
    @observable prevError;
    @observable retryIntervalIndex;
    @observable nextRunTs;
    @observable input;
    @observable prevResult;
    @observable paused;
    @observable timesSaved;
    @observable updatedTs;
    @observable deleted;        

*/

export interface JobStatus {
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

export function serializeJobStatus(job: Job): JobStatus {
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
}

export interface SerializedJob {
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

export function serializeJob(job: Job): SerializedJob {
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
}

export function serializedToArray(o: SerializedJob) {
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
}

export function deserializeJob<TEnv>(jobStorage: JobStorage<TEnv>, jobRow: any): Job {
    for (let k in jobRow) if (jobRow[k] === null) delete jobRow[k];
    const serialized: SerializedJob = jobRow;

    const jobType = jobStorage.allJobTypes[serialized.jobType];
    if (!jobType)
        //
        throw new Error(`CODE00000000 jobType=${serialized.jobType} - not found!`);

    // let r_parent: Job | undefined;
    // if (serialized.parent) r_parent = jobStorage.findJobById(env, serialized.parent);

    const r = new Job(
        jobType,
        jobStorage,
        serialized.input ? JSON.parse(serialized.input) : undefined,
        serialized.id,
        serialized.key,
        serialized.parent
    );

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
}
