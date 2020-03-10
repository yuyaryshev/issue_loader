import better_sqlite3 from "better-sqlite3";
import { AllJobTypesBase, Job, JobStorage, JobType } from "Yjob";

export interface TestEnv {
    jobStorage: JobStorage<TestEnv>;
    db: better_sqlite3.Database;
    JobType1: JobType<TestEnv, TestJobInput, TestJobOutput>;
    JobType2: JobType<TestEnv, TestJobInput, TestJobOutput>;
    JobType3: JobType<TestEnv, TestJobInput, TestJobOutput>;
    JobType4: JobType<TestEnv, TestJobInput, TestJobOutput>;
    testJobTypes: AllJobTypesBase;
}
export interface TestJobInput {
    a: any;
}
export interface TestJobOutput {
    r: any;
}
export interface TestJobTypes {}

export type TestJobFunc = (job: Job, a: any) => Promise<any>;

export interface TestEnvInput {
    job1?: TestJobFunc;
    job2?: TestJobFunc;
    job3?: TestJobFunc;
    job4?: TestJobFunc;
}

export function makeTestEnv(einp?: TestEnvInput): TestEnv {
    let env: TestEnv = {} as any;

    env.JobType1 = new JobType<TestEnv, TestJobInput, TestJobOutput>({
        cpl: "CODE00000237",
        type: "JobType1",
        stored: true,
        func: async (env: TestEnv, job: Job, input: TestJobInput): Promise<TestJobOutput> => {
            return (await einp?.job1?.(job, input.a)) || { r: "J1 r -> " + input.a };
        },
    });

    env.JobType2 = new JobType<TestEnv, TestJobInput, TestJobOutput>({
        cpl: "CODE00000001",
        type: "JobType2",
        stored: true,
        func: async (env: TestEnv, job: Job, input: TestJobInput): Promise<TestJobOutput> => {
            return (await einp?.job2?.(job, input.a)) || { r: "J2 r -> " + input.a };
        },
    });

    env.JobType3 = new JobType<TestEnv, TestJobInput, TestJobOutput>({
        cpl: "CODE00000023",
        type: "JobType3",
        stored: true,
        func: async (env: TestEnv, job: Job, input: TestJobInput): Promise<TestJobOutput> => {
            return (await einp?.job3?.(job, input.a)) || { r: "J3 r -> " + input.a };
        },
    });

    env.JobType4 = new JobType<TestEnv, TestJobInput, TestJobOutput>({
        cpl: "CODE00000024",
        type: "JobType4",
        stored: true,
        func: async (env: TestEnv, job: Job, input: TestJobInput): Promise<TestJobOutput> => {
            return (await einp?.job4?.(job, input.a)) || { r: "J4 r -> " + input.a };
        },
    });

    env.testJobTypes = {
        jobType1: env.JobType1,
        jobType2: env.JobType2,
        jobType3: env.JobType3,
        jobType4: env.JobType4,
    };

    env.db = better_sqlite3(":memory:");
    env.jobStorage = new JobStorage({
        env,
        db: env.db,
        historyDb: better_sqlite3(":memory:"),
        allJobTypes: env.testJobTypes,
    });

    return env;
}

describe(`yjob_tests_env`, function() {
    let env: TestEnv = undefined as any;
    it(`init`, async function() {
        env = makeTestEnv();
        env.jobStorage.close();
        // OK if no exceptions thrown
    });
});
