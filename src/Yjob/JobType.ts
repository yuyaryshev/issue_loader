import { awaitDelay, EnvWithTimers, manageableTimer, ReversePromise, reversePromiseResolveItem } from "Ystd";
import { Job, JobDependencyItem, ObserverItem } from "./Job";
import { JobStorage } from "./JobStorage";
import { JobWaitingDepsException, JobWaitingDepsSymbol } from "./JobWaitingDepsException";
import { v4 as uuid } from "uuid";
import { runJob } from "./mainLogic_JobLifeCycle";
import { JobContext } from "Yjob/JobContext";
import { JobContextType } from "Yjob/JobContextType";
import { makeJobContextKey, makeJobKey } from "Yjob/makeJobKey";
import {
    DefaultJobContextStatus,
    DefaultJobStatus,
    DefaultSerializedJob,
    DefaultSerializedJobContext,
} from "Yjob/JobFieldsServer";
import { JobResources } from "Yjob/JobResources";
import { checkPredecessors, setPredecessor } from "Yjob/predecessors";

export type GetContextInputFunc<
    TEnv extends EnvWithTimers = any,
    TContext extends JobContext<any> = any,
    TContextIn = any,
    TIn = any,
    TOut = any
> = (env: TEnv, job: Job<TEnv, TContext, TIn, TOut>, input: TIn) => TContextIn;
export type PresetDepsFunc<
    TEnv extends EnvWithTimers = any,
    TContext extends JobContext<any> = any,
    TContextIn = any,
    TIn = any,
    TOut = any
> = (env: TEnv, job: Job<TEnv, TContext, TIn, TOut>, contextInput: TContextIn, input: TIn) => void;
export type JobFunc<
    TEnv extends EnvWithTimers = any,
    TContext extends JobContext<any> = any,
    TContextIn = any,
    TIn = any,
    TOut = any
> = (env: TEnv, job: Job<TEnv, TContext, TIn, TOut>, contextInput: TContextIn, input: TIn) => TOut | Promise<TOut>;

export interface JobTypeInput<
    TEnv extends EnvWithTimers = any,
    TContext extends JobContext<any> = any,
    TContextIn = any,
    TIn = any,
    TOut = any
> {
    cpl: string;
    type: string;
    stage?: string;
    resources?: JobResources;
    jobContextType: JobContextType;
    presetDepsFunc?: PresetDepsFunc<TEnv, TContext, TContextIn, TIn, TOut>;
    func: JobFunc<TEnv, TContext, TContextIn, TIn, TOut>;
}

export interface JobCallAux {
    parentContext: JobContext<any> | undefined;
    contextInput: any;
    jobInput: any;
    customFields: any;
    jobContextKey: string;
    jobKey: string;
}

export class JobType<
    TEnv extends EnvWithTimers = any,
    TContextIn = any,
    TIn = any,
    TOut = any,
    TContext extends JobContext<any> = JobContext<any>,
    TJob extends Job = Job,
    TSerializedJobContext extends DefaultSerializedJobContext = DefaultSerializedJobContext,
    TJobContextStatus extends DefaultJobContextStatus = DefaultJobContextStatus,
    TSerializedJob extends DefaultSerializedJob = DefaultSerializedJob,
    TJobStatus extends DefaultJobStatus = DefaultJobStatus
> implements JobTypeInput<TEnv, TContext, TContextIn, TIn, TOut> {
    cpl: string;
    type: string;
    stage: string;
    resources: JobResources;
    jobContextType: JobContextType;
    presetDepsFunc?: PresetDepsFunc<TEnv, TContext, TContextIn, TIn, TOut>;
    func: JobFunc<TEnv, TContext, TContextIn, TIn, TOut>;

    constructor(input: JobTypeInput<TEnv, TContext, TContextIn, TIn, TOut>) {
        this.cpl = input.cpl;
        this.type = input.type;
        this.stage = input.stage || input.type;
        this.resources = input.resources || {};
        this.jobContextType = input.jobContextType;

        if (!this.cpl || !this.cpl.length) throw new Error(`CODE00000293 Can't create JobType without cpl!`);
        if (!this.type || !this.type.length)
            throw new Error(`CODE00000294 Can't create JobType type === undefined or empty !`);

        this.presetDepsFunc = input.presetDepsFunc;
        this.func = input.func;
    }

    dep(parent: Job, input: TIn & TContextIn) {
        // TODO добавить в parent dep на child создаваемый через input
        const jobStorage = parent.jobStorage;
        const parentContext = parent?.jobContext;
        const { contextInput, jobInput, customFields } = this.jobContextType.extractInputFunc(jobStorage.env, input);
        const jobContextKey = makeJobContextKey(this.jobContextType.type, contextInput);
        const jobKey = makeJobKey(this.type, jobInput);
        let newJob: boolean = false;

        let jobContext0: JobContext<TEnv, any, any, any, any, any> | undefined =
            parentContext?.key === jobContextKey ? parentContext : undefined;

        // TODO переделываю тело функции ниже... Остановился тут
        // Нужно просто создать Dep у parent от job, который задается через input
        /////////////////////////////////////////////

        const jobContext = jobContext0! || this.jobContextType.open(jobStorage as any, contextInput);

        let job: Job = jobContext.getJobByKey(jobKey)!;
        if (!job) {
            newJob = true;

            const jobId = jobStorage.env.intIdManagerForSqlite.newId();
            job = new Job<TEnv, TContext, TIn, TOut>(
                (this as any) as JobType,
                jobContext,
                jobInput,
                jobId,
                jobKey,
                parent?.id
            );
            jobContext.addJob(job);
            for (let handler of job.jobStorage.onJobCreatedHandlers) handler(job, "CODE00000177");
        }

        if (parent) setPredecessor(job, parent);

        if (newJob && this.presetDepsFunc) {
            this.presetDepsFunc(jobStorage.env, job, contextInput, input);
            checkPredecessors(job);
        }

        // Not found in context, search in JobStorage or create a new job
        // TODO тут нужно в будущем обработать external JobContext
        // if (extendedFields)
        //     for (let fieldKey in extendedFields)
        //         if (extendedFields.hasOwnProperty(fieldKey) && (job as any)[fieldKey] !== extendedFields[fieldKey])
        //             (job as any)[fieldKey] = extendedFields[fieldKey];
    }

    // Эта функция просто собирает всякие вот эти свойства. Используется внутренне везде где они нужны
    makeJobCallAux(
        jobStorage: JobStorage<TEnv, TSerializedJobContext, TJobContextStatus, TSerializedJob, TJobStatus>,
        parent: Job | undefined,
        input: TIn & TContextIn
    ): JobCallAux {
        const parentContext = parent?.jobContext;
        const { contextInput, jobInput, customFields } = this.jobContextType.extractInputFunc(jobStorage.env, input);
        const jobContextKey = makeJobContextKey(this.jobContextType.type, contextInput);
        const jobKey = makeJobKey(this.type, jobInput);
        return {
            parentContext,
            contextInput,
            jobInput,
            customFields,
            jobContextKey,
            jobKey,
        };
    }

    getJob(
        jobStorage: JobStorage<TEnv, TSerializedJobContext, TJobContextStatus, TSerializedJob, TJobStatus>,
        parent: Job | undefined,
        input: TIn & TContextIn,
        forceStale?: boolean,
        extendedFields?: any,
        creationReversePromise?: ReversePromise,
        jobCallAux0?: JobCallAux
    ): TJob {
        const jobCallAux = jobCallAux0 || this.makeJobCallAux(jobStorage, parent, input);
        const { parentContext, contextInput, jobInput, customFields, jobContextKey, jobKey } = jobCallAux;
        let newJob: boolean = false;

        let jobContext0: JobContext<TEnv, any, any, any, any, any> | undefined =
            parentContext?.key === jobContextKey ? parentContext : undefined;

        const jobContext =
            jobContext0! ||
            this.jobContextType.open(
                jobStorage as any,
                contextInput,
                false,
                Object.assign({}, extendedFields, customFields),
                undefined
            );

        let job: Job = jobContext.getJobByKey(jobKey)!;
        if (!job) {
            newJob = true;

            // @ts-ignore
            const jobId = jobStorage.env.intIdManagerForSqlite.newId();
            job = new Job<TEnv, TContext, TIn, TOut>(
                (this as any) as JobType,
                jobContext,
                jobInput,
                jobId,
                jobKey,
                parent?.id
            );
            jobContext.addJob(job);
            for (let handler of job.jobStorage.onJobCreatedHandlers) handler(job, "CODE00000234");
        }

        if (parent) setPredecessor(job, parent);

        // Not found in context, search in JobStorage or create a new job
        if (extendedFields)
            for (let fieldKey in extendedFields)
                if (extendedFields.hasOwnProperty(fieldKey) && (job as any)[fieldKey] !== extendedFields[fieldKey])
                    (job as any)[fieldKey] = extendedFields[fieldKey];

        if (forceStale) job.makeStale();

        if (newJob && this.presetDepsFunc) {
            this.presetDepsFunc(jobStorage.env, job, contextInput, input);
            checkPredecessors(job);
        }

        if (!parent) jobStorage.insertedNewJob();

        if (parent) setPredecessor(job, parent);

        reversePromiseResolveItem(creationReversePromise);
        return job as TJob;
    }

    runNoWait(
        jobStorage: JobStorage<TEnv, TSerializedJobContext, TJobContextStatus, TSerializedJob, TJobStatus>,
        parent: Job | undefined,
        input: TIn & TContextIn,
        forceStale?: boolean,
        extendedFields?: any,
        creationReversePromise?: ReversePromise,
        jobCallAux0?: JobCallAux
    ) {
        const jobCallAux = jobCallAux0 || this.makeJobCallAux(jobStorage, parent, input);
        const { jobKey, parentContext } = jobCallAux;

        if (true)
            // TODO jobStorage. НЕ переполнен
            this.getJob(jobStorage, parent, input, forceStale, extendedFields, creationReversePromise, jobCallAux);

        // TODO ИНАЧЕ jobStorage. Сохранить создание в таблицу
        // TODO Вызвать это создание позднее!
    }

    async importJob(
        jobStorage: JobStorage<TEnv, TSerializedJobContext, TJobContextStatus, TSerializedJob, TJobStatus>,
        input: TIn & TContextIn,
        result: any,
        overwriteExisting: boolean,
        extendedFields?: any,
        creationReversePromise?: ReversePromise
    ) {
        const jobCallAux = this.makeJobCallAux(jobStorage, undefined, input);
        const { jobKey, parentContext } = jobCallAux;
        const job = this.getJob(
            jobStorage,
            undefined,
            input,
            false,
            extendedFields,
            creationReversePromise,
            jobCallAux
        );
        const doWrite = !job.succeded || overwriteExisting;
        if (doWrite) {
            job.nextRunTs = undefined;
            job.prevError = undefined;
            job.succeded = true;
            job.result = result;
            job.jobStorage.updateJobState(job);
            await job.save(true);
        }
    }

    runWait(
        jobStorage: JobStorage<TEnv, TSerializedJobContext, TJobContextStatus, TSerializedJob, TJobStatus>,
        parent: Job | undefined,
        input: TIn & TContextIn,
        forceStale?: boolean,
        extendedFields?: any,
        creationReversePromise?: ReversePromise,
        disableUnload?: boolean,
        jobCallAux0?: JobCallAux
    ): Promise<TOut | JobWaitingDepsException | Symbol> | TOut | JobWaitingDepsException | Symbol {
        const jobCallAux = jobCallAux0 || this.makeJobCallAux(jobStorage, parent, input);
        const { jobKey, parentContext } = jobCallAux;

        if (parentContext) {
            const depItem = parentContext.externalDeps_get(jobKey);
            if (depItem?.succeded) {
                reversePromiseResolveItem(creationReversePromise);
                return depItem.result;
            }
        }

        const job = this.getJob(
            jobStorage,
            parent,
            input,
            forceStale,
            extendedFields,
            creationReversePromise,
            jobCallAux
        );

        // Function ending - save job result into parent's context and return the result
        const tailFunc = () => {
            if (parent) setPredecessor(job, parent);
            return job.result;
        };

        // If the job is finished - return result immediatly
        if (job.succeded) return tailFunc();

        if (!job.jobContext.disableUnload && !job.predecessorsDone) return JobWaitingDepsSymbol;
        if (disableUnload) job.jobContext.disableUnload++;

        // Job isn't finished yet. Async mode...
        return (async function awaitRunJob() {
            try {
                //if (job.state === "readyToRun") runJob(job); // NO AWAIT HERE! Await is below implemented with await awaitDelay & while!

                // Wait for a while for job to finish without unloading it
                let totalAwaitTime = 0;

                let delay = 10;
                while (job.jobContext.disableUnload || totalAwaitTime < 500) {
                    totalAwaitTime += delay;
                    if (jobStorage.closing || job.unloaded) return JobWaitingDepsSymbol;
                    await awaitDelay(delay);
                    if (job.succeded) return tailFunc();
                }

                return JobWaitingDepsSymbol;
            } finally {
                if (disableUnload) job.jobContext.disableUnload--;
            }
        })();
    }
}

export async function throwUnload<T>(
    promise: Promise<T | JobWaitingDepsException | Symbol> | T | JobWaitingDepsException | Symbol
): Promise<T> {
    const r = await promise;
    if (r === JobWaitingDepsSymbol) throw new JobWaitingDepsException("CODE00000320");

    if (r instanceof JobWaitingDepsException) throw r;
    return r as any;
}
