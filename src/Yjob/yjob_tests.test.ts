import { expect } from "chai";
import { makeTestEnv, TestEnv } from "./yjob_tests_env.test";
import { Job } from "./Job";
import { awaitDelay, defaultCompare } from "Ystd";
import { throwUnload } from "./JobType";
//import {stringify} from "javascript-stringify"

const removedFields = [
    "cancelled",
    "createdTs",
    "finishedTs",
    "startedTs",
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
    // "prevResult",
    // "retryIntervalIndex",
    // "succeded",
];

const xit = (...args: any[]) => {};

function removeCols(rows: any, additionalRemoves: string[] = [], keepCols: string[] = []) {
    for (let row of rows)
        for (let k in row)
            if ((removedFields.includes(k) && !keepCols.includes(k)) || additionalRemoves.includes(k)) delete row[k];
    rows.sort((a: any, b: any) => defaultCompare(a.jobType, b.jobType));
    return rows;
}

describe(`yjob_tests`, function() {
    it(`T_SIMPLE(1): empty test`, function() {
        //console.log("started111!!");
        expect(1).to.equal(1);
    });

    it(`T_SIMPLE(2): simple - init`, async function() {
        let env: TestEnv = makeTestEnv();
        // OK if no exceptions thrown
        const r = await env.JobType1.run(env.jobStorage, undefined, { a: "77" });
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
                const r1 = await env.JobType2.run(env.jobStorage, job, { a: 11 });
                const r2 = await env.JobType3.run(env.jobStorage, job, { a: 22 });
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
            const r = await env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            await awaitDelay(10);
            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`CODE00000028 Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
                },
            ]);

            expect(callsCount).to.equal(5);
        } finally {
            env.jobStorage.close();
        }
    });

    it(`T_ERROR(5): job3 - failed, never recovered`, async function() {
        /*
        джоб родитель вечно ждет результат джоба потомка
        */
        let callsCount = 0;
        let testFinished = false;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });

                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                //throw new Error(`CODE00000186 Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                callsCount++;
                if (!testFinished) throw new Error(`CODE00000188 Test error!`);
                return a * 100;
            },
        });
        env.jobStorage.maxAwaitBeforeUnload = 99999999999;
        try {
            // // this.timeout(1000000);

            env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            while (callsCount < 5) {
                await awaitDelay(0);
            }
            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            // console.log(stringify(dbData, undefined, "    "));
            for (let row of dbData) if (row.retryIntervalIndex) row.retryIntervalIndex = "some";
            expect(dbData).to.deep.equal([
                {
                    deps_succeded: 1,
                    jobType: "JobType1",
                    succeded: 0,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    input: '{"a":"77"}',
                    prevResult: null,
                },
                {
                    deps_succeded: 1,
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    deps_succeded: 1,
                    jobType: "JobType3",
                    succeded: 0,
                    prevError: null,
                    retryIntervalIndex: "some",
                    nextRunTs: null,
                    input: '{"a":22}',
                    prevResult: null,
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                callsCount++;
                if (callsCount <= 4) throw new Error(`CODE00000192 Test error!`);

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
            const r = await env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            await awaitDelay(10);
            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
                },
            ]);

            expect(callsCount).to.equal(5); // TODO ???????????????
        } finally {
            env.jobStorage.close();
        }
    });

    it(`T_ERROR(7): job1 - failed, after job2 and job3 - and never recovered`, async function() {
        let callsCount = 0;
        let testFinished = false;
        const env = makeTestEnv({
            job1: async (job: Job, a: any) => {
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                callsCount++;
                if (!testFinished) throw new Error(`CODE00000196 Test error!`); // TODO скорректировать

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
            env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            while (callsCount < 5) {
                await awaitDelay(0);
            }

            //expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from job`).all());
            // TODO  - like delete row[retryIntervalIndex]

            //console.log(stringify(dbData, undefined, "    "));
            for (let row of dbData) if (row.retryIntervalIndex) row.retryIntervalIndex = "some";
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 0,
                    prevError: null,
                    retryIntervalIndex: "some", /// TODO
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: null,
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
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
                if (!testFinished) throw new Error(`CODE00000029 Test error!`);

                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
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
            env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            while (callsCount < 5) {
                await awaitDelay(0);
            }

            //expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            //console.log(stringify(dbData, undefined, "    "));

            for (let row of dbData) if (row.retryIntervalIndex) row.retryIntervalIndex = "some";
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 0,
                    prevError: null,
                    retryIntervalIndex: "some",
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: null,
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
                if (callsCount <= 4) throw new Error(`CODE00000286 Test error!`);

                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
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
            await env.JobType1.run(env.jobStorage, undefined, { a: "77" });
            const dbData = removeCols(env.db.prepare(`select * from job`).all());
            for (let row of dbData) if (row.retryIntervalIndex) row.retryIntervalIndex = "some";
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount1++;
                if (!testFinished) throw new Error(`CODE00000019 Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                callsCount2++;
                if (!testFinished) throw new Error(`CODE00000021 Test error!`);
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            while (callsCount1 < 5 && callsCount2 < 5) {
                await awaitDelay(0);
            }

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            for (let row of dbData) if (row.retryIntervalIndex) row.retryIntervalIndex = "some";
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 0,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: null,
                },
                {
                    jobType: "JobType2",
                    succeded: 0,
                    prevError: null,
                    retryIntervalIndex: "some",
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: null,
                },
                {
                    jobType: "JobType3",
                    succeded: 0,
                    prevError: null,
                    retryIntervalIndex: "some",
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: null,
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount1++;
                if (callsCount1 <= 4) throw new Error(`CODE00000025 Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                callsCount2++;
                if (callsCount2 <= 4) throw new Error(`CODE00000027 Test error!`);
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            await env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            //console.log(stringify(dbData, undefined, "    "));

            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount1++;
                console.log("callsCount1 = ", callsCount1);
                if (callsCount1 <= 3) throw new Error(`CODE00000030 Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                callsCount2++;
                console.log("callsCount2 = ", callsCount2);
                if (!testFinished) throw new Error(`CODE00000032 Test error!`);
                return a * 100;
            },
        });

        try {
            this.timeout(10000);
            env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            while (callsCount1 < 3 || callsCount2 < 5) {
                await awaitDelay(10);
            }

            await awaitDelay(10);

            const dbData = removeCols(env.db.prepare(`select * from job`).all());
            for (let row of dbData) if (row.retryIntervalIndex) row.retryIntervalIndex = "some";

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 0,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: null,
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 0,
                    prevError: null,
                    retryIntervalIndex: "some",
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: null,
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
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
                if (callsCount <= 3) throw new Error(`CODE00000287 Test error!`);

                const r1 = await throwUnload(env.JobType1.run(env.jobStorage, job, { a: "77" }));
                r1.r = a; //JobUnloadException

                if (!testFinished) throw new Error(`CODE00000189 Test error!`);
                return r1;
            },
        });
        try {
            // this.timeout(2000000000);
            env.JobType4.run(env.jobStorage, undefined, { a: "7" });

            while (callsCount < 5) {
                await awaitDelay(0);
            }

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            for (let row of dbData) if (row.retryIntervalIndex) row.retryIntervalIndex = "some";

            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
                },
                {
                    jobType: "JobType4",
                    succeded: 0,
                    prevError: null,
                    retryIntervalIndex: "some",
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"7"}',
                    prevResult: null,
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
                if (callsCount <= 4) throw new Error(`CODE00000279 Test error!`);

                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`CODE00000190 Test error!`);
                return a * 100;
            },
            job4: async (job: Job, a: any) => {
                const r1 = await throwUnload(env.JobType1.run(env.jobStorage, job, { a: "77" }));
                r1.r = a;
                return r1;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType4.run(env.jobStorage, undefined, { a: "7" });

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            for (let row of dbData) if (row.retryIntervalIndex) row.retryIntervalIndex = "some";

            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
                },
                {
                    jobType: "JobType4",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"7"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77","r":"7"}',
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;

                callsCount++;
                if (callsCount <= 4) throw new Error(`CODE00000285 Test error!`);

                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                callsCount++;
                if (!testFinished) throw new Error(`CODE00000284 Test error!`);
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            while (callsCount < 5) {
                await awaitDelay(0);
            }

            const dbData = removeCols(env.db.prepare(`select * from job`).all());
            for (let row of dbData) if (row.retryIntervalIndex) row.retryIntervalIndex = "some";

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 0,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: null,
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 0,
                    prevError: null,
                    retryIntervalIndex: "some",
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: null,
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`CODE00000191 Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`CODE00000193 Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`CODE00000194 Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`CODE00000195 Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`CODE00000197 Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`CODE00000198 Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`CODE00000199 Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
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
                const rr1 = env.JobType2.run(env.jobStorage, job, { a: 11 });
                const rr2 = env.JobType3.run(env.jobStorage, job, { a: 22 });
                const r1 = await rr1;
                const r2 = await rr2;
                return { r1, r2, a };
            },
            job2: async (job: Job, a: any) => {
                callsCount++;
                if (callsCount <= 4) throw new Error(`CODE00000022 Test error!`);
                return a * 10;
            },
            job3: async (job: Job, a: any) => {
                return a * 100;
            },
        });
        try {
            // this.timeout(2000000000);
            const r = await env.JobType1.run(env.jobStorage, undefined, { a: "77" });

            expect(r).to.deep.equal({ r1: 110, r2: 2200, a: "77" });

            // for(let [,job] of env.jobStorage.jobsById) job.save();

            const dbData = removeCols(env.db.prepare(`select * from job`).all());

            //console.log(stringify(dbData, undefined, "    "));
            expect(dbData).to.deep.equal([
                {
                    jobType: "JobType1",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":"77"}',
                    prevResult: '{"r1":110,"r2":2200,"a":"77"}',
                },
                {
                    jobType: "JobType2",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":11}',
                    prevResult: "110",
                },
                {
                    jobType: "JobType3",
                    succeded: 1,
                    prevError: null,
                    retryIntervalIndex: 0,
                    nextRunTs: null,
                    deps_succeded: 1,
                    input: '{"a":22}',
                    prevResult: "2200",
                },
            ]);
        } finally {
            env.jobStorage.close();
        }
    });
});
