import { JobFunc, JobType, JobTypeInput } from "./JobType";
import { JobStorage } from "./JobStorage";
import { Job } from "./Job";

export type SingletonJobFunc<TEnv> = (env: TEnv, job: Job) => void | Promise<void>;

export function singletonJob<TEnv>(
    env: TEnv,
    jobStorage: JobStorage<TEnv>,
    cpl: string,
    type: string,
    singletonFunc: SingletonJobFunc<TEnv>
) {
    const func = ((env: any, job: Job) => {
        return singletonFunc(env, job);
    }) as JobFunc<TEnv, void, void>;

    const input = { stored: false, func, type, cpl } as JobTypeInput<TEnv, void, void>;
    const jobType = new JobType(input);

    return jobType.run(jobStorage, undefined, input as any);
}
