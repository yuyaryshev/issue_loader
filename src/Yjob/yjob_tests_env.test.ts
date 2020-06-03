import better_sqlite3 from "better-sqlite3";
import { AllJobContextTypesBase, AllJobTypesBase, Job, JobContextType, JobStorage, JobType } from "Yjob";
import { Env } from "other";
import { debugMsgFactory as debugjs, EnvWithTimers } from "Ystd";

const debugUtJobStart = debugjs("ut.yjob.startup");

export interface TestEnv extends EnvWithTimers {
    jobStorage: JobStorage<TestEnv>;
    db: better_sqlite3.Database;
    testJobContext: JobContextType;
    JobType1: JobType<TestEnv, TestContextInput, TestJobInput, TestJobOutput>;
    JobType2: JobType<TestEnv, TestContextInput, TestJobInput, TestJobOutput>;
    JobType3: JobType<TestEnv, TestContextInput, TestJobInput, TestJobOutput>;
    JobType4: JobType<TestEnv, TestContextInput, TestJobInput, TestJobOutput>;
    testJobTypes: AllJobTypesBase;
    testJobContextTypes: AllJobContextTypesBase;
}

export interface TestContextInput {
    project?: string | undefined;
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

export function makeTestEnv(testEnvInput?: TestEnvInput): TestEnv {
    let env: TestEnv = { timers: new Set() } as any;

    env.testJobContext = new JobContextType<any, any, any>({
        cpl: "CODE00000277",
        type: "issue",
        extractInputFunc: (
            env: Env,
            input: TestContextInput & {} //TIn & TContextIn
        ) => {
            const { project, ...jobInput } = input;
            return {
                contextInput: {
                    project,
                },
                jobInput,
            };
        },
    });
    env.JobType1 = new JobType<TestEnv, TestContextInput, TestJobInput, TestJobOutput>({
        cpl: "CODE00000237",
        type: "JobType1",
        stage: "02_stage",
        jobContextType: env.testJobContext,
        func: async (
            env: TestEnv,
            job: Job,
            contextInput: TestContextInput,
            input: TestJobInput
        ): Promise<TestJobOutput> => {
            debugUtJobStart(`CODE00000186 JobType1 started`);
            const r = (await testEnvInput?.job1?.(job, input.a)) || { r: "J1 r -> " + input.a };
            debugUtJobStart(`CODE00000021 JobType1 finished`);
            return r;
        },
    });

    env.JobType2 = new JobType<TestEnv, TestContextInput, TestJobInput, TestJobOutput>({
        cpl: "CODE00000256",
        type: "JobType2",
        stage: "01_stage",
        jobContextType: env.testJobContext,
        func: async (
            env: TestEnv,
            job: Job,
            contextInput: TestContextInput,
            input: TestJobInput
        ): Promise<TestJobOutput> => {
            debugUtJobStart(`CODE00000022 JobType2 started`);
            const r = (await testEnvInput?.job2?.(job, input.a)) || { r: "J2 r -> " + input.a };
            debugUtJobStart(`CODE00000253 JobType2 finished`);
            return r;
        },
    });

    env.JobType3 = new JobType<TestEnv, TestContextInput, TestJobInput, TestJobOutput>({
        cpl: "CODE00000023",
        type: "JobType3",
        stage: "01_stage",
        jobContextType: env.testJobContext,
        func: async (
            env: TestEnv,
            job: Job,
            contextInput: TestContextInput,
            input: TestJobInput
        ): Promise<TestJobOutput> => {
            debugUtJobStart(`CODE00000254 JobType3 started`);
            const r = (await testEnvInput?.job3?.(job, input.a)) || { r: "J3 r -> " + input.a };
            debugUtJobStart(`CODE00000255 JobType3 finished`);
            return r;
        },
    });

    env.JobType4 = new JobType<TestEnv, TestContextInput, TestJobInput, TestJobOutput>({
        cpl: "CODE00000024",
        type: "JobType4",
        stage: "04_stage",
        jobContextType: env.testJobContext,
        func: async (
            env: TestEnv,
            job: Job,
            contextInput: TestContextInput,
            input: TestJobInput
        ): Promise<TestJobOutput> => {
            debugUtJobStart(`CODE00000284 JobType4 started`);
            const r = (await testEnvInput?.job4?.(job, input.a)) || { r: "J4 r -> " + input.a };
            debugUtJobStart(`CODE00000285 JobType4 finished`);
            return r;
        },
    });

    env.testJobContextTypes = {
        testJobContext: env.testJobContext,
    };

    env.testJobTypes = {
        jobType1: env.JobType1,
        jobType2: env.JobType2,
        jobType3: env.JobType3,
        jobType4: env.JobType4,
    };

    env.db = better_sqlite3(":memory:");
    env.jobStorage = new JobStorage({
        env,
        allJobContextTypes: env.testJobContextTypes,
        db: env.db,
        historyDb: better_sqlite3(":memory:"),
        allJobTypes: env.testJobTypes,
        noBatchMode: true,
        jobResourcesLimits: {
            jira: 10,
            cpu: 10,
            db: 1000,
        },
    });
    env.jobStorage.startRegularFunc();

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
