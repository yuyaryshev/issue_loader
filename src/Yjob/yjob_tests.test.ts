import { expect } from "chai";
import { makeTestEnv, TestEnv } from "./yjob_tests_env.test";
import { Job } from "./Job";
import { awaitDelay, defaultCompare } from "Ystd";
import { throwUnload } from "./JobType";
//import {stringify} from "javascript-stringify"

const removedFields = [
    "cancelled",
    "updatedTs",
    "id",
    "parent",
    "priority",
    "key",
    "paused",
    "timesSaved",
    "deleted",
    // "input",
    // "jobType",
    // "key",
    // "nextRunTs",
    // "prevError",
    // "result",
    // "retryIntervalIndex",
    // "succeded",
];

const xit = (...args: any[]) => {};

function removeColsFromRow(row: any, additionalRemoves: string[], keepCols: string[], replaceRetrying0: boolean) {
    const replaceRetrying =
        replaceRetrying0 && row.retryIntervalIndex > 0 && (row.state === "running" || row.state === "waitingTime");

    if (row.nextRunTs) row.nextRunTs = "some";
    if (row.retryIntervalIndex) row.retryIntervalIndex = "some";

    if (row.jobsById && typeof row.jobsById === "string") {
        row.jobsById = JSON.parse(row.jobsById);
        //rows.sort((a: any, b: any) => defaultCompare(a.jobType, b.jobType));
        for (let j in row.jobsById) {
            removeColsFromRow(row.jobsById[j], additionalRemoves, keepCols, replaceRetrying);
            row.jobsById[row.jobsById[j].jobType] = row.jobsById[j];
            delete row.jobsById[j];
        }
    }

    if (replaceRetrying) {
        delete row.nextRunTs;
        delete row.retryIntervalIndex;
        row.state = "retrying";
    }

    for (let k in row)
        if ((removedFields.includes(k) && !keepCols.includes(k)) || additionalRemoves.includes(k)) delete row[k];
}

function removeCols(
    rows: any,
    additionalRemoves: string[] = [],
    keepCols: string[] = [],
    replaceRetrying: boolean = false
) {
    for (let row of rows) removeColsFromRow(row, additionalRemoves, keepCols, replaceRetrying);
    rows.sort((a: any, b: any) => defaultCompare(a.jobType, b.jobType));
    return rows;
}

function removeColsRetrying(rows: any, additionalRemoves: string[] = [], keepCols: string[] = []) {
    return removeCols(rows, additionalRemoves, keepCols, true);
}

describe(`yjob_tests`, function() {
    it(`T_SIMPLE(1): empty test`, function() {
        //console.log("started111!!");
        expect(1).to.equal(1);
    });

    it(`T_SIMPLE(2): simple - init`, async function() {
        let env: TestEnv = makeTestEnv();
        // OK if no exceptions thrown
        const r = await env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });
        expect(r).to.deep.equal({ r: "J1 r -> 77" });

        env.jobStorage.close();
    });

    it(`T_SIMPLE(3): three jobs - success`, async function() {
        /*
        SCHEMA:
        -job1: - success
            -job2: - success
            -job3: - success
        */

        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const r1 = await env.JobType2.runWait(env.jobStorage, job, { project: "proj1", a: 11 });
                const r2 = await env.JobType3.runWait(env.jobStorage, job, { project: "proj1", a: 22 });
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });

        try {
            //this.timeout(2000000000);
            const r = await env.JobType1.runWait(
                env.jobStorage,
                undefined,
                { project: "proj1", a: "77" },
                undefined,
                undefined,
                undefined,
                true
            );

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            await awaitDelay(10);
            // const dbData1 = (env.db.prepare(`select * from jobContexts`).all());
            // console.log("YAAAAA", stringify(dbData1, undefined, "    "));

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: '{"project":"proj1"}',
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            retryIntervalIndex: 0,
                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            result: '{"r1":110,"r2":2200,"a":"77"}',
                            state: "succeded",
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            retryIntervalIndex: 0,
                            predecessorsDone: 1,
                            input: '{"a":11}',
                            result: "110",
                            state: "succeded",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            retryIntervalIndex: 0,
                            predecessorsDone: 1,
                            input: '{"a":22}',
                            result: "2200",
                            state: "succeded",
                        },
                    },
                },
            ]);
        } finally {
            env.jobStorage.close();
        }
    });

    it(`T_ERROR(4): job2 - failed, than recovered`, async function() {
        let callsCount = 0;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            result: '{"r1":110,"r2":2200,"a":"77"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                    },
                },
            ]);

            expect(callsCount).to.equal(5);
        } finally {
            env.jobStorage.close();
        }
    });

    it(`T_ERROR(5): job3 - failed, never recovered`, async function() {
        // TODO тест не завершается. Нужно починить
        /*
        джоб родитель вечно ждет результат джоба потомка
        */
        let callsCount = 0;
        let testFinished = false;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });

                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                callsCount++;
                if (!testFinished) throw new Error(`Test error!`);
                return a * 100;
            },
        });

        try {
            //this.timeout(1000000);

            env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            while (callsCount < 5) {
                await awaitDelay(0);
            }
            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            // console.log(stringify(dbData, undefined, "    "));

            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 0,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: "Test error!",

                    retryIntervalIndex: "some",
                    state: "running",
                    succeded: 0,
                    stage: "01_stage",

                    jobsById: {
                        JobType1: {
                            predecessorsDone: 0,
                            jobType: "JobType1",
                            succeded: 0,
                            retryIntervalIndex: 0,
                            input: '{"a":"77"}',
                            state: "running",
                        },
                        JobType2: {
                            predecessorsDone: 1,
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            predecessorsDone: 1,
                            jobType: "JobType3",
                            succeded: 0,

                            retryIntervalIndex: "some",

                            input: '{"a":22}',
                            state: "running",
                            prevError: "Test error!",
                        },
                    },
                },
            ]);
        } finally {
            testFinished = true;
            env.jobStorage.close();
        }
    });

    // it(`dont delete please`, async function() {
    //     console.log(dummyFunc1(1, 3));
    // });

    //  TO DO  проверить
    it(`T_ERROR(6): job1 - failed, after job2 and job3 - and recovered`, async function() {
        let callsCount = 0;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            //this.timeout(2000000000);
            const r = await env.JobType1.runWait(
                env.jobStorage,
                undefined,
                { a: "77" },
                undefined,
                undefined,
                undefined,
                true
            );

            //expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            await awaitDelay(10);
            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                    },
                },
            ]);

            expect(callsCount).to.equal(5); // TODO ???????????????
        } finally {
            env.jobStorage.close();
        }
    });

    it(`T_ERROR(7): job1 - failed, after job2 and job3 - and never recovered`, async function() {
        // TODO тест не завершается. Нужно починить

        let callsCount = 0;
        let testFinished = false;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                callsCount++;
                if (!testFinished) throw new Error(`Test error!`); // TODO скорректировать

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            env.JobType1.runWait(env.jobStorage, undefined, { a: "77" }, undefined, undefined, undefined, true);

            while (callsCount < 5) {
                await awaitDelay(0);
            }

            //expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());
            // TODO  - like delete row[retryIntervalIndex]

            //console.log(stringify(dbData, undefined, "    "));

            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: "Test error!",
                    retryIntervalIndex: "some",
                    state: "running",
                    succeded: 0,
                    stage: "02_stage",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 0,

                            retryIntervalIndex: "some", /// TODO
                            prevError: "Test error!",

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            state: "running",
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                    },
                },
            ]);
        } finally {
            testFinished = true;
            env.jobStorage.close();
        }
    });

    /// TO DO проверить
    it(`T_ERROR(8): job1 - failed, before job2 and job3 - and never recovered`, async function() {
        let callsCount = 0;
        let testFinished = false;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                callsCount++;
                if (!testFinished) throw new Error(`Test error!`);

                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            while (callsCount < 5) {
                await awaitDelay(0);
            }

            //expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));

            env.jobStorage.allJobContextTypes;

            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: "Test error!",
                    retryIntervalIndex: "some",
                    state: "running",
                    succeded: 0,
                    stage: "02_stage",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 0,

                            retryIntervalIndex: "some",

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            state: "running",
                            prevError: "Test error!",
                        },
                    },
                },
            ]);
        } finally {
            testFinished = true;
            env.jobStorage.close();
        }
    });

    it(`T_ERROR(9): job1 - failed, before job2 and job3 - and recovered`, async function() {
        let callsCount = 0;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);

                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            await env.JobType1.runWait(env.jobStorage, undefined, { a: "77" }, undefined, undefined, undefined, true);
            await awaitDelay(50);
            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                    },
                },
            ]);
        } finally {
            env.jobStorage.close();
        }
    });

    it(`T_ERROR(10): job2 and job3 - failed and never recovered`, async function() {
        let callsCount1 = 0;
        let callsCount2 = 0;
        let testFinished = false;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount1++;
                if (!testFinished) throw new Error(`Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                callsCount2++;
                if (!testFinished) throw new Error(`Test error!`);
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            while (callsCount1 < 5 && callsCount2 < 5) {
                await awaitDelay(0);
            }

            const dbData = removeColsRetrying(env.db.prepare(`select * from jobContexts`).all());

            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    prevError: "Test error!",
                    state: "retrying",
                    succeded: 0,
                    stage: "01_stage",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 0,

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            state: "running",
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            state: "retrying",
                            prevError: "Test error!",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            state: "retrying",
                            prevError: "Test error!",
                        },
                    },
                },
            ]);

            //expect(callsCount1).to.equal(5);
            //expect(callsCount1).to.equal(5);
        } finally {
            testFinished = true;
            await awaitDelay(50);
            env.jobStorage.close();
        }
    });

    // TO DO проверить
    it(`T_ERROR(11): job2 and job3 - failed and recovered`, async function() {
        let callsCount1 = 0;
        let callsCount2 = 0;

        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount1++;
                if (callsCount1 <= 4) throw new Error(`Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                callsCount2++;
                if (callsCount2 <= 4) throw new Error(`Test error!`);
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            await env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));

            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                    },
                },
            ]);

            //expect(callsCount1).to.equal(5);
            //expect(callsCount1).to.equal(5);
        } finally {
            env.jobStorage.close();
        }
    });

    it(`T_ERROR(12): job2, job3 failed and job2 recovered, job3 never recovered`, async function() {
        let callsCount1 = 0;
        let callsCount2 = 0;
        let testFinished = false;

        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount1++;
                //console.log("callsCount1 = ", callsCount1);
                if (callsCount1 <= 3) throw new Error(`Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                callsCount2++;
                //console.log("callsCount2 = ", callsCount2);
                if (!testFinished) throw new Error(`Test error!`);
                return a * 100;
            },
        });

        try {
            // this.timeout(10000);
            env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            while (callsCount1 < 3 || callsCount2 < 5) {
                await awaitDelay(10);
            }

            await awaitDelay(10);

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 0,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: "Test error!",
                    retryIntervalIndex: "some",
                    state: "running",
                    succeded: 0,
                    stage: "01_stage",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 0,

                            retryIntervalIndex: 0,

                            predecessorsDone: 0,
                            input: '{"a":"77"}',
                            state: "running",
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 0,

                            retryIntervalIndex: "some",

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            state: "running",
                            prevError: "Test error!",
                        },
                    },
                },
            ]);
        } finally {
            testFinished = true;
            env.jobStorage.close();
        }
    });

    it(`T_ERROR(13): job4_case: job4 failed before job1, job2, job3, and failed after and never recovered`, async function() {
        /*
        NEW SCHEMA:
        -job4:
            -job1:
                -job2:
                -job3: -ERROR
        */
        let callsCount = 0;
        let testFinished = false;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
            job4: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 3) throw new Error(`Test error!`);

                const r1 = await throwUnload(env.JobType1.runWait(env.jobStorage, job, { a: "77" }));
                r1.r = a; //JobUnloadException

                if (!testFinished) throw new Error(`Test error!`);
                return r1;
            },
        });
        try {
            // this.timeout(2000000000);
            env.JobType4.runWait(env.jobStorage, undefined, { a: "7" });

            while (callsCount < 5) {
                await awaitDelay(0);
            }

            const dbData = removeColsRetrying(env.db.prepare(`select * from jobContexts`).all());

            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    prevError: "Test error!",
                    state: "retrying",
                    succeded: 0,
                    stage: "04_stage",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77","r":"7"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                        JobType4: {
                            jobType: "JobType4",
                            succeded: 0,

                            predecessorsDone: 1,
                            input: '{"a":"7"}',
                            state: "retrying",
                            prevError: "Test error!",
                        },
                    },
                },
            ]);
        } finally {
            testFinished = true;
            env.jobStorage.close();
        }
    });

    it(`T_ERROR(14): job4_case: job3 failed, and several times later job3 - recovered`, async function() {
        let callsCount = 0;
        let testFinished = false;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);

                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);
                return a * 100;
            },
            job4: async (job: Job, a: any) => {
                const r1 = await throwUnload(env.JobType1.runWait(env.jobStorage, job, { a: "77" }));
                r1.r = a;
                return r1;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType4.runWait(env.jobStorage, undefined, { a: "7" });

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77","r":"7"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                        JobType4: {
                            jobType: "JobType4",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"7"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77","r":"7"}',
                        },
                    },
                },
            ]);
        } finally {
            env.jobStorage.close();
        }
    });

    it(`T_ERROR(15): job4_case: job3 failed, and never recovered`, async function() {
        /*
        -job4:
            -job1:
                -job2:
                -job3: -ERROR
        */
        let callsCount = 0;
        let testFinished = false;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                callsCount++;
                if (!testFinished) throw new Error(`Test error!`);
                return a * 100;
            },
            job4: async (job: Job, a: any) => {
                const r1 = await throwUnload(env.JobType1.runWait(env.jobStorage, job, { a: "77" }));
                r1.r = a;
                return r1;
            },
        });
        try {
            // this.timeout(2000000000);
            env.JobType4.runWait(env.jobStorage, undefined, { a: "7" }, undefined, undefined, undefined, false);

            while (callsCount < 5) {
                await awaitDelay(0);
            }

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 0,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: "Test error!",
                    retryIntervalIndex: "some",
                    state: "running",
                    succeded: 0,
                    stage: "01_stage",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 0,

                            retryIntervalIndex: 0,

                            predecessorsDone: 0,
                            input: '{"a":"77"}',
                            state: "running",
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 0,

                            retryIntervalIndex: "some",

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            state: "running",
                            prevError: "Test error!",
                        },
                        JobType4: {
                            jobType: "JobType4",
                            succeded: 0,
                            state: "running",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"7"}',
                        },
                    },
                },
            ]);
        } finally {
            testFinished = true;
            env.jobStorage.close();
        }
    });

    xit(`T_PAUSE(16): job2 - paused, than resumed`, async function() {
        let callsCount = 0;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                    },
                },
            ]);
        } finally {
            env.jobStorage.close();
        }
    });

    xit(`T_PAUSE(17): job2 - paused, never resumed`, async function() {
        let callsCount = 0;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                    },
                },
            ]);
        } finally {
            env.jobStorage.close();
        }
    });

    xit(`T_PAUSE(18): job1, job2, job3 - paused; - never resumed`, async function() {
        let callsCount = 0;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                    },
                },
            ]);
        } finally {
            env.jobStorage.close();
        }
    });

    xit(`T_PAUSE(19): job1, job2, job3 - paused; - then resumed`, async function() {
        let callsCount = 0;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                    },
                },
            ]);
        } finally {
            env.jobStorage.close();
        }
    });

    xit(`T_PAUSE(20): job1, job2, job3 - paused; - then job2 resumed, other never resumed`, async function() {
        let callsCount = 0;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                    },
                },
            ]);
        } finally {
            env.jobStorage.close();
        }
    });

    xit(`T_PAUSE(21): job1, job2, job3 - paused; - then job1 resumed, other never resumed`, async function() {
        let callsCount = 0;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",
                            retryIntervalIndex: 0,
                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                    },
                },
            ]);
        } finally {
            env.jobStorage.close();
        }
    });

    xit(`T_PAUSE(22): job1, job2, job3 - paused; - then job1 resumed, after 5 times job2 resumed, job3 never resumed`, async function() {
        let callsCount = 0;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                    },
                },
            ]);
        } finally {
            env.jobStorage.close();
        }
    });

    xit(`T_PAUSE(23): job1, job2, job3 - paused; - then job1 resumed, after 5 times job2, job3 resumed`, async function() {
        let callsCount = 0;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.runWait(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.runWait(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.runWait(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: "{}",
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"77"}',
                            prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                        },
                        JobType2: {
                            jobType: "JobType2",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":11}',
                            prevResult: "110",
                        },
                        JobType3: {
                            jobType: "JobType3",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":22}',
                            prevResult: "2200",
                        },
                    },
                },
            ]);
        } finally {
            env.jobStorage.close();
        }
    });

    it(`T_SPECA(24): jobContext2 unloaded, jobContext3 trying to go after jobContext1`, async function() {
        /*
        jobStorage.maxContextsInMem = 10 (просто проверка)

        -jobContext1 - running
        -jobContext2 - running
        -jobContext3 - running

        ------
        создаем 15 джобов
        */
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                job;
                console.log(`${a} is working`);
                return a;
            },
        });
        try {
            //this.timeout(2000000000);
            env.jobStorage.maxContextsInMem = 10;

            const r1 = await env.JobType1.runWait(
                env.jobStorage,
                undefined,
                { a: "JobContext1", project: "testproj1" },
                undefined,
                undefined,
                undefined,
                true
            );
            const r2 = await env.JobType1.runWait(
                env.jobStorage,
                undefined,
                { a: "JobContext2", project: "testproj2" },
                undefined,
                undefined,
                undefined,
                true
            );

            const r3 = await env.JobType1.runWait(
                env.jobStorage,
                undefined,
                { a: "JobContext3", project: "testproj3" },
                undefined,
                undefined,
                undefined,
                true
            );

            await awaitDelay(10);
            const dbData = removeCols(env.db.prepare(`select * from jobContexts`).all());

            ///////const sql2 = env.db.prepare(`select * from jobContexts`).all();

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    predecessorsDone: 1,
                    input: '{"project":"testproj1"}',
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"JobContext1"}',
                            prevResult: '"JobContext1"',
                        },
                    },
                },
                {
                    predecessorsDone: 1,
                    input: '{"project":"testproj2"}',
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"JobContext2"}',
                            prevResult: '"JobContext2"',
                        },
                    },
                },
                {
                    predecessorsDone: 1,
                    input: '{"project":"testproj3"}',
                    jobContextType: "issue",
                    nextRunTs: null,
                    prevError: null,
                    retryIntervalIndex: 0,
                    state: "succeded",
                    succeded: 1,
                    stage: "99_succeded",

                    jobsById: {
                        JobType1: {
                            jobType: "JobType1",
                            succeded: 1,
                            state: "succeded",

                            retryIntervalIndex: 0,

                            predecessorsDone: 1,
                            input: '{"a":"JobContext3"}',
                            prevResult: '"JobContext3"',
                        },
                    },
                },
            ]);
        } finally {
            env.jobStorage.close();
        }
    });

    it(`T_SPECA(25): startin 15 job contexts, and watch load/unload`, async function() {
        /*
        -group1 - running
        -group2 - unloading (and should go second)
        -group3 - (should go third)
        */
        let order = "";
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                order += `_${a}`;
                return a;
            },
        });
        try {
            //this.timeout(2000000000);
            //env.jobStorage.maxContextsInMem = 10;

            for (let i = 1; i <= 15; i++) {
                env.JobType1.runWait(
                    env.jobStorage,
                    undefined,
                    { a: i, project: `testproj${i}` },
                    undefined,
                    undefined,
                    undefined,
                    false
                );
            }

            await awaitDelay(10);

            expect(order).to.deep.equal("_1_2_3_4_5_6_7_8_9_10_11_12_13_14_15");
        } finally {
            env.jobStorage.close();
        }
    });
});
