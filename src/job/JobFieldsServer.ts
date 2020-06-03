import { Job } from "Yjob";
import { JobContextFieldFuncs, JobFieldFuncs, JobResultFieldFuncs, JobStorage } from "Yjob";
import { JobContext } from "Yjob";
import { JobState } from "Yjob/JobState";
import { EnvWithTimers } from "Ystd";

import {
    DefaultJobContextStatus,
    DefaultJobStatus,
    DefaultSerializedJob,
    DefaultSerializedJobContext,
    DefaultSerializedJobContextMem,
} from "Yjob/JobFieldsServer";

import moment from "moment";
// @ts-ignore
require("moment-countdown");

export const jobContextFieldFuncs: JobContextFieldFuncs<SerializedJobContext, JobContextStatus> = {
    jobContextColumnStr:
        "id, key, priority, predecessorsDone, jobContextType, succeded, prevError, retryIntervalIndex, nextRunTs, input, paused, timesSaved, state, stage, project, issueKey, updated",
    jobContextColumnPlaceholderStr: "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?",
    jobContextMemColumnStr:
        "id, key, priority, predecessorsDone, jobContextType, succeded, prevError, retryIntervalIndex, nextRunTs, paused, timesSaved, updatedTs, state, stage, project, issueKey, updated",
    jobContextMemColumnPlaceholderStr: "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?",

    serializeStatus: function serializeStatus(j: JobContext): JobContextStatus {
        const { issueKey, ...input } = j.input as any;

        for (let jobId in j.jobsById) {
            const sj = j.jobsById[jobId];
        }

        return {
            deleted: 0,
            updatedTs: moment().format(),
            jobContextType: j.jobContextType.type,
            id: j.id,
            key: j.key,
            priority: j.priority,
            predecessorsDone: j.predecessorsDone ? 1 : 0,
            succeded: j.succeded ? 1 : 0,
            prevError: j.prevError,
            retryIntervalIndex: j.retryIntervalIndex,
            nextRunTs: j.nextRunTs ? j.nextRunTs.format() : undefined,
            input: JSON.stringify(input),
            paused: j.paused ? 1 : 0,
            timesSaved: j.timesSaved,
            state: j.state,
            stage: j.stage,
            project: (j as any).project,
            issueKey: issueKey,
            updated: (j as any).updated,
        };
    },
    serialize: function serialize(j: JobContext): SerializedJobContext {
        const { issueKey, ...input } = j.input as any;

        for (let jobId in j.jobsById) {
            const sj = j.jobsById[jobId];
        }

        return {
            updatedTs: moment().format(),
            jobContextType: j.jobContextType.type,
            id: j.id,
            key: j.key,
            priority: j.priority,
            predecessorsDone: j.predecessorsDone ? 1 : 0,
            succeded: j.succeded ? 1 : 0,
            prevError: j.prevError,
            retryIntervalIndex: j.retryIntervalIndex,
            nextRunTs: j.nextRunTs ? j.nextRunTs.format() : undefined,
            input: JSON.stringify(input),
            paused: j.paused ? 1 : 0,
            timesSaved: j.timesSaved,
            state: j.state,
            stage: j.stage,
            project: (j as any).project,
            issueKey: issueKey,
            updated: (j as any).updated,
        };
    },
    serializeMem: function serializeMem(j: JobContext): SerializedJobContextMem {
        const { issueKey, ...input } = j.input as any;

        return {
            updatedTs: moment().format(),
            jobContextType: j.jobContextType.type,
            id: j.id,
            key: j.key,
            priority: j.priority,
            predecessorsDone: j.predecessorsDone ? 1 : 0,
            succeded: j.succeded ? 1 : 0,
            prevError: j.prevError,
            retryIntervalIndex: j.retryIntervalIndex,
            nextRunTs: j.nextRunTs ? j.nextRunTs.format() : undefined,
            paused: j.paused ? 1 : 0,
            timesSaved: j.timesSaved,
            state: j.state,
            stage: j.stage,
            project: (j as any).project,
            issueKey: issueKey,
            updated: (j as any).updated,
        };
    },
    serializeToArray: function serializedToArray(o: SerializedJobContext) {
        return [
            o.id,
            o.key,
            o.priority,
            o.predecessorsDone,
            o.jobContextType,
            o.succeded,
            o.prevError,
            o.retryIntervalIndex,
            o.nextRunTs,
            o.input,
            o.paused,
            o.timesSaved,
            o.state,
            o.stage,
            o.project,
            o.issueKey,
            o.updated,
        ];
    },

    serializeMemToArray: function serializedMemToArray(o: SerializedJobContextMem) {
        return [
            o.id,
            o.key,
            o.priority,
            o.predecessorsDone,
            o.jobContextType,
            o.succeded,
            o.prevError,
            o.retryIntervalIndex,
            o.nextRunTs,
            o.paused,
            o.timesSaved,
            o.updatedTs,
            o.state,
            o.stage,
            o.project,
            o.issueKey,
            o.updated,
        ];
    },

    rowToSerialized: function rowToSerialized(row: any): SerializedJobContext {
        for (let k in row) if (row[k] === null) delete row[k];
        const serialized: SerializedJobContext = row;
        serialized.input = serialized.input ? JSON.parse(serialized.input) : {};

        (serialized as any).input.issueKey = (serialized as any).issueKey;
        return serialized;
    },

    deserialize: function deserialize<TEnv extends EnvWithTimers>(
        jobStorage: JobStorage<TEnv, SerializedJobContext, JobContextStatus, SerializedJob, JobStatus>,
        serialized: SerializedJobContext
    ): JobContext {
        const jobContextType = jobStorage.allJobContextTypes[serialized.jobContextType];
        if (!jobContextType) throw new Error(`CODE00000321 jobContextType=${serialized.jobContextType} - not found!`);

        const r = new JobContext<any, any, any, any, any, any>(
            jobContextType,
            jobStorage,
            serialized.input,
            serialized.id,
            serialized.key
        );

        r.priority = serialized.priority;
        r.predecessorsDone = !!serialized.predecessorsDone;
        r.succeded = !!serialized.succeded;
        r.prevError = serialized.prevError;
        r.retryIntervalIndex = serialized.retryIntervalIndex;
        r.nextRunTs = serialized.nextRunTs ? moment(serialized.nextRunTs) : undefined;
        r.paused = !!serialized.paused;
        r.timesSaved = serialized.timesSaved;
        r.state = serialized.state;
        r.stage = serialized.stage;
        (r as any).project = serialized.project;
        (r as any).issueKey = serialized.issueKey;
        (r as any).updated = serialized.updated;
        r.jobsById = {} as any;
        let locJobsById = JSON.parse((serialized as any).jobsById);
        for (let jobId in locJobsById) {
            const serializedJob = locJobsById[jobId];

            const jobType = jobStorage.allJobTypes[serializedJob.jobType];

            const jr = new Job(
                jobType,
                r,
                serializedJob.input,
                serializedJob.id,
                serializedJob.key,
                serializedJob.parent,
                true
            );

            jr.priority = serializedJob.priority;
            jr.cancelled = !!serializedJob.cancelled;
            jr.predecessorsDone = !!serializedJob.predecessorsDone;
            jr.succeded = !!serializedJob.succeded;
            jr.prevError = serializedJob.prevError;
            jr.retryIntervalIndex = serializedJob.retryIntervalIndex;
            jr.nextRunTs = serializedJob.nextRunTs ? moment(serializedJob.nextRunTs) : undefined;
            jr.paused = !!serializedJob.paused;
            jr.state = serializedJob.state;

            r.jobsById[jobId] = jr;
            //r.jobsByKey[jr.key] = jr;
        }

        return r;
    },
};

/* Client class declaraion
export class JobStatus {
    @observable id: number=0;
    @observable jobContextId: number=0;
    @observable key: string="" as any;
    @observable priority: number | undefined=0;
    @observable cancelled: number=0;
    @observable predecessorsDone: number=0;
    @observable jobType: string="";
    @observable succeded: number=0;
    @observable prevError: string | undefined="" as any;
    @observable retryIntervalIndex: number=0;
    @observable nextRunTs: string | undefined="";
    @observable input: any=undefined;
    @observable result: any | undefined=undefined;
    @observable paused: number=0;
    @observable state: JobState="" as any;
    @observable parent: number | undefined=0;
};

export class JobContextStatus {
    @observable id: number=0;
    @observable key: string="" as any;
    @observable jobsById: any={};
    @observable priority: number | undefined=0;
    @observable predecessorsDone: number=0;
    @observable jobContextType: string="";
    @observable succeded: number=0;
    @observable prevError: string | undefined="" as any;
    @observable retryIntervalIndex: number=0;
    @observable nextRunTs: string | undefined="";
    @observable input: any=undefined;
    @observable paused: number=0;
    @observable timesSaved: number=0;
    @observable updatedTs: string="";
    @observable deleted: number | undefined=0;
    @observable state: JobState="" as any;
    @observable stage: string="" as any;
    @observable project: string | undefined="" as any;
    @observable issueKey: string | undefined="" as any;
    @observable updated: string | undefined="" as any;
};
*/

/////
export const jobFieldFuncs: JobFieldFuncs<SerializedJob, JobStatus> = {
    jobColumnStr:
        "id, jobContextId, key, priority, cancelled, predecessorsDone, succeded, prevError, retryIntervalIndex, nextRunTs, input, paused, state, parent",
    jobColumnPlaceholderStr: "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?",
    jobMemColumnStr: "",
    jobMemColumnPlaceholderStr: "",

    serializeStatus: function serializeStatus(j: Job): JobStatus {
        const input = j.input;

        return {
            jobType: "TEST",
            id: j.id,
            jobContextId: j.jobContextId,
            key: j.key,
            priority: j.priority,
            cancelled: j.cancelled ? 1 : 0,
            predecessorsDone: j.predecessorsDone ? 1 : 0,
            succeded: j.succeded ? 1 : 0,
            prevError: j.prevError,
            retryIntervalIndex: j.retryIntervalIndex,
            nextRunTs: j.nextRunTs ? j.nextRunTs.format() : undefined,
            input: JSON.stringify(j.input),
            paused: j.paused ? 1 : 0,
            state: j.state,
            parent: j.parent,
        };
    },
    serialize: function serialize(j: Job): SerializedJob {
        const input = j.input;

        return {
            jobType: "TEST",
            id: j.id,
            jobContextId: j.jobContextId,
            key: j.key,
            priority: j.priority,
            cancelled: j.cancelled ? 1 : 0,
            predecessorsDone: j.predecessorsDone ? 1 : 0,
            succeded: j.succeded ? 1 : 0,
            prevError: j.prevError,
            retryIntervalIndex: j.retryIntervalIndex,
            nextRunTs: j.nextRunTs ? j.nextRunTs.format() : undefined,
            input: JSON.stringify(j.input),
            paused: j.paused ? 1 : 0,
            state: j.state,
            parent: j.parent,
        };
    },
    serializeToArray: function serializedToArray(o: SerializedJob) {
        return [
            o.id,
            o.jobContextId,
            o.key,
            o.priority,
            o.cancelled,
            o.predecessorsDone,
            o.succeded,
            o.prevError,
            o.retryIntervalIndex,
            o.nextRunTs,
            o.input,
            o.paused,
            o.state,
            o.parent,
        ];
    },

    rowToSerialized: function rowToSerialized(row: any): SerializedJob {
        for (let k in row) if (row[k] === null) delete row[k];
        const serialized: SerializedJob = row;
        serialized.input = serialized.input ? JSON.parse(serialized.input) : {};

        return serialized;
    },

    deserialize: function deserialize<TEnv extends EnvWithTimers>(
        jobStorage: JobStorage<TEnv, any, any, SerializedJob, JobStatus>,
        serialized: SerializedJob,
        jobContext: JobContext
    ): Job {
        const jobType = jobStorage.allJobTypes[serialized.jobType];
        const r = new Job(jobType, jobContext, serialized.input, serialized.id, serialized.key, serialized.parent);
        return r;
    },
};
////

////-----
export const jobResultFieldFuncs: JobResultFieldFuncs<any, any> = {
    jobResultColumnStr: "id, result",
    jobResultColumnPlaceholderStr: "?, ?",
    jobResultMemColumnStr: "",
    jobResultMemColumnPlaceholderStr: "",

    serialize: function serialize(j: Job): any {
        const input = j.input;

        return {
            id: j.id,
            result: JSON.stringify(j.result),
        };
    },

    deserialize: function deserialize<TEnv extends EnvWithTimers>(
        jobStorage: JobStorage<TEnv, any, any, SerializedJob, JobStatus>,
        serialized: any,
        job: Job
    ): Job {
        job.result = JSON.parse(serialized.result);
        return job;
    },
};
////-----

export interface JobStatus extends DefaultJobStatus {
    id: number;
    jobContextId: number;
    key: string;
    priority: number | undefined;
    cancelled: number;
    predecessorsDone: number;
    jobType: string;
    succeded: number;
    prevError: string | undefined;
    retryIntervalIndex: number;
    nextRunTs: string | undefined;
    input: any;
    paused: number;
    state: JobState;
    parent: number | undefined;
}

export interface SerializedJob extends DefaultSerializedJob {
    id: number;
    jobContextId: number;
    key: string;
    priority: number | undefined;
    cancelled: number;
    predecessorsDone: number;
    jobType: string;
    succeded: number;
    prevError: string | undefined;
    retryIntervalIndex: number;
    nextRunTs: string | undefined;
    input: any;
    paused: number;
    state: JobState;
    parent: number | undefined;
}

export interface SerializedJobs {
    [key: string]: SerializedJob;
}

export interface JobsStatus {
    [key: string]: JobStatus;
}

export interface JobContextStatus extends DefaultJobContextStatus {
    id: number;
    key: string;
    priority: number | undefined;
    predecessorsDone: number;
    jobContextType: string;
    succeded: number;
    prevError: string | undefined;
    retryIntervalIndex: number;
    nextRunTs: string | undefined;
    input: any;
    paused: number;
    timesSaved: number;
    updatedTs: string;
    deleted: number | undefined;
    state: JobState;
    stage: string;
    project: string | undefined;
    issueKey: string | undefined;
    updated: string | undefined;
}

export interface SerializedJobContext extends DefaultSerializedJobContext {
    id: number;
    key: string;
    priority: number | undefined;
    predecessorsDone: number;
    jobContextType: string;
    succeded: number;
    prevError: string | undefined;
    retryIntervalIndex: number;
    nextRunTs: string | undefined;
    input: any;
    paused: number;
    timesSaved: number;
    updatedTs: string;
    state: JobState;
    stage: string;
    project: string | undefined;
    issueKey: string | undefined;
    updated: string | undefined;
}

export interface SerializedJobContextMem extends DefaultSerializedJobContextMem {
    id: number;
    key: string;
    priority: number | undefined;
    predecessorsDone: number;
    jobContextType: string;
    succeded: number;
    prevError: string | undefined;
    retryIntervalIndex: number;
    nextRunTs: string | undefined;
    paused: number;
    timesSaved: number;
    updatedTs: string;
    state: JobState;
    stage: string;
    project: string | undefined;
    issueKey: string | undefined;
    updated: string | undefined;
}

/*
    
export interface JobStatus extends DefaultJobStatus {
    id: number,
        jobContextId: number,
        key: string,
        priority: number | undefined,
        cancelled: number,
        predecessorsDone: number,
        jobType: string,
        succeded: number,
        prevError: string | undefined,
        retryIntervalIndex: number,
        nextRunTs: string | undefined,
        input: any,
        paused: number,
        state: JobState,
        parent: number | undefined        
}

    
export interface SerializedJob extends DefaultSerializedJob {
    id: number,
        jobContextId: number,
        key: string,
        priority: number | undefined,
        cancelled: number,
        predecessorsDone: number,
        jobType: string,
        succeded: number,
        prevError: string | undefined,
        retryIntervalIndex: number,
        nextRunTs: string | undefined,
        input: any,
        paused: number,
        state: JobState,
        parent: number | undefined        
}

*/
