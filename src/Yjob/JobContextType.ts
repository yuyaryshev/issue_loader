import { EnvWithTimers, ReversePromise, reversePromiseResolveItem } from "Ystd";
import { Job } from "./Job";
import { JobStorage } from "./JobStorage";
import { makeJobContextKey } from "./makeJobKey";
import { v4 as uuid } from "uuid";
import { JobContext } from "Yjob/JobContext";

export type ExtractInputFunc<TEnv = any, TContext extends JobContext<any> = any, TContextIn = any, TIn = any> = (
    env: TEnv,
    input: TIn & TContextIn
) => {
    contextInput: TContextIn;
    jobInput: TIn;
    customFields?: { [key: string]: any };
};

export interface JobContextTypeInput<TEnv = any, TContext extends JobContext<any> = any, TContextIn = any> {
    cpl: string;
    type: string;
    extractInputFunc: ExtractInputFunc;
}

export class JobContextType<TEnv extends EnvWithTimers = any, TContext extends JobContext<any> = any, TContextIn = any>
    implements JobContextTypeInput<TEnv, TContext, TContextIn> {
    cpl: string;
    type: string;
    extractInputFunc: ExtractInputFunc;

    constructor(input: JobContextTypeInput<TEnv, TContext, TContextIn>) {
        this.cpl = input.cpl;
        this.type = input.type;
        this.extractInputFunc = input.extractInputFunc;

        if (!this.cpl || !this.cpl.length) throw new Error(`CODE00000303 Can't create JobContextType without cpl!`);
        if (!this.type || !this.type.length)
            throw new Error(`CODE00000304 Can't create JobContextType type === undefined or empty !`);
    }

    open(
        jobStorage: JobStorage<TEnv>,
        input: TContextIn,
        forceStale?: boolean,
        extendedFields?: any,
        creationReversePromise?: ReversePromise
    ): TContext {
        const { contextInput } = this.extractInputFunc(jobStorage.env, input);
        const jobContextKey = makeJobContextKey(this.type, contextInput);

        let jobContext: JobContext<any> | undefined;

        jobContext = jobStorage.findOrLoadJobContextByKey(jobContextKey);

        if (!jobContext) {
            // @ts-ignore
            const contextId = jobStorage.env.intIdManagerForSqlite.newId();
            jobContext = new JobContext<TEnv, any, any, any, any, any>(
                this,
                jobStorage,
                contextInput,
                contextId,
                jobContextKey,
                1
            );
            for (let handler of jobContext.jobStorage.onJobContextCreatedHandlers) handler(jobContext, "CODE00000305");
        }

        if (extendedFields)
            for (let fieldKey in extendedFields)
                if (
                    extendedFields.hasOwnProperty(fieldKey) &&
                    extendedFields[fieldKey] !== undefined &&
                    (jobContext as any)[fieldKey] !== extendedFields[fieldKey]
                )
                    (jobContext as any)[fieldKey] = extendedFields[fieldKey];

        if (forceStale) for (let job of jobContext.jobsArray()) job.makeStale();

        reversePromiseResolveItem(creationReversePromise);
        return jobContext as TContext;
    }
}
