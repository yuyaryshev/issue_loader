import { Job } from "./Job";
import { JobContextFieldFuncs, JobFieldFuncs, JobResultFieldFuncs, JobStorage } from "./JobStorage";
import { JobContext } from "./JobContext";
import { JobState } from "Yjob/JobState";
import { EnvWithTimers } from "Ystd";

import moment from "moment";
// @ts-ignore
require("moment-countdown");

export const defaultJobContextFieldFuncs: JobContextFieldFuncs<DefaultSerializedJobContext, DefaultJobContextStatus> = {
    jobContextColumnStr:
        "id, key, priority, predecessorsDone, jobContextType, succeded, prevError, retryIntervalIndex, nextRunTs, input, paused, timesSaved, state, stage",
    jobContextColumnPlaceholderStr: "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?",
    jobContextMemColumnStr:
        "id, key, priority, predecessorsDone, jobContextType, succeded, prevError, retryIntervalIndex, nextRunTs, paused, timesSaved, updatedTs, state, stage",
    jobContextMemColumnPlaceholderStr: "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?",

    serializeStatus: function serializeStatus(j: JobContext): DefaultJobContextStatus {
        const input = j.input;

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
        };
    },
    serialize: function serialize(j: JobContext): DefaultSerializedJobContext {
        const input = j.input;

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
        };
    },
    serializeMem: function serializeMem(j: JobContext): DefaultSerializedJobContextMem {
        const input = j.input;

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
        };
    },
    serializeToArray: function serializedToArray(o: DefaultSerializedJobContext) {
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
        ];
    },

    serializeMemToArray: function serializedMemToArray(o: DefaultSerializedJobContextMem) {
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
        ];
    },

    rowToSerialized: function rowToSerialized(row: any): DefaultSerializedJobContext {
        for (let k in row) if (row[k] === null) delete row[k];
        const serialized: DefaultSerializedJobContext = row;
        serialized.input = serialized.input ? JSON.parse(serialized.input) : {};

        return serialized;
    },

    deserialize: function deserialize<TEnv extends EnvWithTimers>(
        jobStorage: JobStorage<
            TEnv,
            DefaultSerializedJobContext,
            DefaultJobContextStatus,
            DefaultSerializedJob,
            DefaultJobStatus
        >,
        serialized: DefaultSerializedJobContext
    ): JobContext {
        const jobContextType = jobStorage.allJobContextTypes[serialized.jobContextType];
        if (!jobContextType) throw new Error(`CODE00000251 jobContextType=${serialized.jobContextType} - not found!`);

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
};
*/

/////
export const defaultJobFieldFuncs: JobFieldFuncs<DefaultSerializedJob, DefaultJobStatus> = {
    jobColumnStr:
        "id, jobContextId, key, priority, cancelled, predecessorsDone, succeded, prevError, retryIntervalIndex, nextRunTs, input, paused, state, parent",
    jobColumnPlaceholderStr: "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?",
    jobMemColumnStr: "",
    jobMemColumnPlaceholderStr: "",

    serializeStatus: function serializeStatus(j: Job): DefaultJobStatus {
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
    serialize: function serialize(j: Job): DefaultSerializedJob {
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
    serializeToArray: function serializedToArray(o: DefaultSerializedJob) {
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

    rowToSerialized: function rowToSerialized(row: any): DefaultSerializedJob {
        for (let k in row) if (row[k] === null) delete row[k];
        const serialized: DefaultSerializedJob = row;
        serialized.input = serialized.input ? JSON.parse(serialized.input) : {};

        return serialized;
    },

    deserialize: function deserialize<TEnv extends EnvWithTimers>(
        jobStorage: JobStorage<TEnv, any, any, DefaultSerializedJob, DefaultJobStatus>,
        serialized: DefaultSerializedJob,
        jobContext: JobContext
    ): Job {
        const jobType = jobStorage.allJobTypes[serialized.jobType];
        const r = new Job(jobType, jobContext, serialized.input, serialized.id, serialized.key, serialized.parent);
        return r;
    },
};
////

////-----
export const defaultJobResultFieldFuncs: JobResultFieldFuncs<any, any> = {
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
        jobStorage: JobStorage<TEnv, any, any, DefaultSerializedJob, DefaultJobStatus>,
        serialized: any,
        job: Job
    ): Job {
        job.result = serialized.result;
        return job;
    },
};
////-----

export interface DefaultJobStatus {
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

export interface DefaultSerializedJob {
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

export interface DefaultSerializedJobs {
    [key: string]: DefaultSerializedJob;
}

export interface DefaultJobsStatus {
    [key: string]: DefaultJobStatus;
}

export interface DefaultJobContextStatus {
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
}

export interface DefaultSerializedJobContext {
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
}

export interface DefaultSerializedJobContextMem {
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
}

/*
    
export interface DefaultJobStatus {
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

    
export interface DefaultSerializedJob {
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
