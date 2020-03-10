import { Database, Statement } from "better-sqlite3";
import { awaitDelay, mapToObject, moveToContainer, runOnce, sha256hex } from "Ystd";
import { diff as deepObjectDiff } from "deep-object-diff";
import { defaultJobFieldFuncs, DefaultJobStatus, DefaultSerializedJob } from "./DefaultJobFieldsServer";
import moment from "moment";
import sortKeys from "sort-keys";
import { Job, JobId, JobKey } from "./Job";
import { JobType } from "./JobType";
import { JobStep } from "./JobStep";
import { makeJobKey } from "./makeJobKey";
import { checkDeps, runJob, sch_ClearNext } from "./JobLifeCycle";
import { sortObjects } from "Ystd";
import deepEqual from "fast-deep-equal";
import { batchWriter, BatchWriter } from "Yjob/batchWriter";

// @ts-ignore
require("moment-countdown");

export type PermanentVaultId = string;
export type PermanentVaultType = string;
export type PermanentVaultPriority = string | number | undefined;
export type PermanentVaultJson = string;

// interface DefaultJobStatusWithUpdatedTs extends DefaultJobStatus{
//     updatedTs?:string;
// }

export interface JobFieldFuncs<
    TSerializedJob extends DefaultSerializedJob = DefaultSerializedJob,
    TJobStatus extends DefaultJobStatus = DefaultJobStatus
> {
    jobColumnStr: string;
    jobColumnPlaceholderStr: string;
    deserializeJob: (jobStorage: JobStorage<any, any, any, any>, jobRow: any) => Job;
    serializedToArray: (o: TSerializedJob) => any[];
    serializeJob: (job: Job) => TSerializedJob;
    serializeJobStatus: (job: Job) => TJobStatus;
}

export interface JobStorageSettings<
    Env,
    AllJobTypes extends AllJobTypesBase = AllJobTypesBase,
    TSerializedJob extends DefaultSerializedJob = DefaultSerializedJob,
    TJobStatus extends DefaultJobStatus = DefaultJobStatus
> {
    env: Env;
    db: Database;
    historyDb?: Database;
    tableName?: string;
    historyTableName?: string;
    bulkSize?: number;
    allJobTypes: AllJobTypes;
    maxRunningJobs?: number;
    maxLoadedJobs?: number;
    autoStartExistingJobs?: boolean;
    regularFuncBulk?: number;
    regularFuncMinTimeout?: number;
    maxAwaitBeforeUnload?: number;
    regularFuncMaxTimeout?: number;
    minUnloadInterval?: number;
    statusTTL?: number;
    console?: any;
    setTimeout?: any;
    jobFieldFuncs?: JobFieldFuncs<TSerializedJob, TJobStatus>;
}

export const defaultJobStorageSettings = {
    tableName: "job",
    historyTableName: "job_history",
    bulkSize: 25,
    maxRunningJobs: Infinity,
    maxLoadedJobs: 100000,
    autoStartExistingJobs: true,
    regularFuncBulk: 10,
    regularFuncMinTimeout: 10,
    maxAwaitBeforeUnload: 60 * 1000,
    regularFuncMaxTimeout: 10,
    minUnloadInterval: 10000,
    statusTTL: 60 * 1000,
    jobFieldFuncs: defaultJobFieldFuncs,
};

export interface AllJobTypesBase {
    [key: string]: JobType;
}

export interface PermanentVaultObject {
    id: string;
    type: string;
    priority?: string | number | undefined;
}

export type JobRunEventHandler = (job: Job, cpl: string) => void;

const jobsRatio = {
    veryLow: 0.1,
    low: 0.7,
    mid: 0.8,
    high: 0.9,
    max: 1,
};

export type IterateJobsCallback = (job: Job) => void | Promise<void>;

export class JobStorage<
    Env,
    AllJobTypes extends AllJobTypesBase = AllJobTypesBase,
    T extends PermanentVaultObject = any,
    TSerializedJob extends DefaultSerializedJob = DefaultSerializedJob,
    TJobStatus extends DefaultJobStatus = DefaultJobStatus
> {
    readonly env: Env;
    readonly allJobTypes: AllJobTypes;
    readonly maxRunningJobs: number;
    readonly maxLoadedJobs: number;
    readonly startRegularFunc: () => Promise<void> | void;
    readonly regularFuncBulk: number;
    readonly regularFuncMinTimeout: number;
    readonly regularFuncMaxTimeout: number;
    public minUnloadInterval: number;
    public lastUnload?: moment.Moment;
    public closing: boolean;
    haveNewSavesFlag: boolean;

    my_console: any;
    my_setTimeout: any;
    maxAwaitBeforeUnload: number;
    statusTTL: number;
    tableName: string;
    bulkSize: number;
    db: Database;
    historyDb?: Database;
    nonSuccededJobsFullyLoaded: boolean;
    statusJobsFullyLoaded: boolean;

    jobsById: Map<string, Job<any>>;
    jobsByKey: Map<string, Job<any>>;
    runningJobs: Set<Job>;
    readyToRunJobs: Job[];
    waitingTimeJobs: Job[];
    pausedJobs: Set<Job>;

    jobsStatus: Map<string, TJobStatus>;
    onJobCreatedHandlers: JobRunEventHandler[];
    onJobLoadedHandlers: JobRunEventHandler[];
    onJobStartHandlers: JobRunEventHandler[];
    onJobStopHandlers: JobRunEventHandler[];
    idsTouchedAfterStatus: Set<string>;

    replaceBatchWriter: BatchWriter;
    historyBatchWriter: BatchWriter | undefined;
    deleteByIdSql: Statement<[PermanentVaultId]>;
    deleteByKeySql: Statement<[PermanentVaultId]>;
    deleteAllSql: Statement<[]>;
    deleteAllTypeSql: Statement<[PermanentVaultType]>;
    queryAllSql: Statement<[]>;
    queryByIdSql: Statement<[string]>;
    queryByKeySql: Statement<[string]>;
    deleteManySql: Statement<PermanentVaultId[]>;
    selectReadyToRunByNextRunTs: Statement<[string, number]>;
    selectAllNotSucceded: Statement<[number]>;
    jobFieldFuncs: JobFieldFuncs<TSerializedJob, TJobStatus>;

    constructor(settings: JobStorageSettings<Env, AllJobTypes, TSerializedJob, TJobStatus>) {
        let {
            env,
            db,
            historyDb,
            tableName,
            historyTableName,
            bulkSize,
            allJobTypes,
            maxRunningJobs,
            maxAwaitBeforeUnload,
            maxLoadedJobs,
            regularFuncBulk,
            regularFuncMinTimeout,
            regularFuncMaxTimeout,
            autoStartExistingJobs,
            minUnloadInterval,
            statusTTL,
            jobFieldFuncs,
        } = Object.assign({}, defaultJobStorageSettings, settings);

        const pthis = this;
        let { jobColumnStr, jobColumnPlaceholderStr } = (this.jobFieldFuncs = jobFieldFuncs!);

        this.my_console = settings.console || console;
        this.my_setTimeout = settings.setTimeout || setTimeout;

        this.env = env;
        if (maxRunningJobs < 1) {
            pthis.my_console.warn(`CODE00000207`, `JobStorage.maxRunningJobs can't be less than 1! Reset to 1`);
            maxRunningJobs = 1;
        }

        if (regularFuncBulk < 1) {
            pthis.my_console.warn(`CODE00000208`, `JobStorage.regularFuncBulk can't be less than 1! Reset to 1`);
            regularFuncBulk = 1;
        }

        if (maxLoadedJobs < 10) {
            pthis.my_console.warn(`CODE00000209`, `JobStorage.maxLoadedJobs can't be less than 10! Reset to 10`);
            maxLoadedJobs = 10;
        }

        if (maxLoadedJobs < maxRunningJobs * 10) {
            const targetValue = Math.round(maxLoadedJobs / 10);
            if (isFinite(maxRunningJobs))
                pthis.my_console.warn(
                    `CODE00000210`,
                    `JobStorage.maxLoadedJobs can't be less than maxRunningJobs*10! Reset to JobStorage.maxRunningJobs = ${targetValue}`
                );
            maxRunningJobs = targetValue;
        }

        if (regularFuncMinTimeout < 0) {
            pthis.my_console.warn(`CODE00000288`, `JobStorage.regularFuncMinTimeout can't be less than 0`);
            regularFuncMinTimeout = 0;
        }

        if (regularFuncMaxTimeout < regularFuncMinTimeout) {
            pthis.my_console.warn(
                `CODE00000289`,
                `JobStorage.regularFuncMaxTimeout can't be less or equal to regularFuncMinTimeout! Reset to regularFuncMinTimeout+1`
            );
            regularFuncMaxTimeout = regularFuncMinTimeout + 1;
        }

        if (minUnloadInterval < minUnloadInterval) {
            pthis.my_console.warn(
                `CODE00000290`,
                `JobStorage.minUnloadInterval can't be less or equal to 50 ms. Reset to 50 ms`
            );
            minUnloadInterval = 50;
        }

        this.haveNewSavesFlag = false;
        this.statusTTL = statusTTL;
        this.minUnloadInterval = minUnloadInterval;
        this.maxRunningJobs = maxRunningJobs;
        this.maxLoadedJobs = maxLoadedJobs;
        this.regularFuncBulk = regularFuncBulk;
        this.regularFuncMinTimeout = regularFuncMinTimeout;
        this.regularFuncMaxTimeout = regularFuncMaxTimeout;
        this.allJobTypes = allJobTypes;
        this.tableName = tableName;
        this.bulkSize = bulkSize;
        this.jobsStatus = new Map();
        this.jobsById = new Map();
        this.jobsByKey = new Map();
        this.db = db;
        this.historyDb = historyDb;
        this.maxAwaitBeforeUnload = maxAwaitBeforeUnload;
        this.readyToRunJobs = [];
        this.waitingTimeJobs = [];
        this.runningJobs = new Set();
        this.pausedJobs = new Set();
        this.idsTouchedAfterStatus = new Set();
        this.closing = false;
        this.nonSuccededJobsFullyLoaded = false;
        this.statusJobsFullyLoaded = false;
        this.onJobCreatedHandlers = [];
        this.onJobLoadedHandlers = [];
        this.onJobStartHandlers = [];
        this.onJobStopHandlers = [];

        // -------------------- db (stg) ------------------------------------------------
        db.exec(`create table if not exists ${tableName} (${jobColumnStr}, primary key(id))`);
        db.exec(`create unique index if not exists ix_${tableName}_key on ${tableName}(key)`);

        if (this.bulkSize < 1 || this.bulkSize > 2000000000)
            throw new Error(`Invalid bulkSize, should be in interval 1..2000000000, use 1 to disable bulk operations`);

        this.replaceBatchWriter = batchWriter({
            db,
            tableName,
            columnsStr: jobColumnStr,
            placeholdersStr: jobColumnPlaceholderStr,
            batchSize: bulkSize,
        });

        this.deleteByIdSql = db.prepare(`delete from ${tableName} where id = ?`);
        this.deleteByKeySql = db.prepare(`delete from ${tableName} where key = ?`);

        const deleteManyParamItems = [];
        for (let i = 0; i < this.bulkSize; i++) deleteManyParamItems.push("?");
        this.deleteManySql = db.prepare(`delete from ${tableName} where id in (${deleteManyParamItems.join(",")})`);

        this.deleteAllSql = db.prepare(`delete from ${tableName}`);
        this.deleteAllTypeSql = db.prepare(`delete from ${tableName} where jobType = ?`);
        this.queryAllSql = db.prepare(`select * from ${tableName} order by priority desc`);
        this.queryByIdSql = db.prepare(`select * from ${tableName} where id = ?`);
        this.queryByKeySql = db.prepare(`select * from ${tableName} where key = ?`);

        this.selectReadyToRunByNextRunTs = db.prepare(
            `select * from ${tableName} where succeded = 0 and deps_succeded = 1 and (nextRunTs is null or nextRunTs < ?) order by nextRunTs limit ?`
        );

        this.selectAllNotSucceded = db.prepare(`select * from ${tableName} where succeded = 0 limit ?`);
        // -------------------- historyDb ------------------------------------------------
        if (historyDb) {
            try {
                historyDb.exec(`create table ${historyTableName} (ts, ${jobColumnStr}, primary key(id,ts))`);
            } catch (e) {}
            this.historyBatchWriter = batchWriter({
                db: historyDb,
                operator: "insert into ",
                tableName: historyTableName,
                columnsStr: "ts, " + jobColumnStr,
                placeholdersStr: "?, " + jobColumnPlaceholderStr,
                batchSize: bulkSize,
            });
        }

        //-------------------------------------------------------------------------------------------------------------------------------
        this.startRegularFunc = async function jobStorageRegularFunc() {
            await pthis.loadUnload(); // Jobs are only loaded or unloaded once per regularFuncMaxTimeout
            while (true) {
                pthis.haveNewSavesFlag = false;
                const nextWaitingJob = pthis.waitingTimeJobs[0];

                // Check if next jobs waiting for time is ready, if so - move them to "Ready" container
                if (nextWaitingJob && moment().diff(nextWaitingJob.nextRunTs) < 0) {
                    sch_ClearNext(nextWaitingJob);
                    pthis.fixJobContainer(nextWaitingJob);
                    continue;
                }

                // Pick next jobs ready to run and run them
                for (let i = 0; i < (pthis.regularFuncBulk || 1); i++) {
                    const job = pthis.pickReadyToRun();
                    if (!job) {
                        if (!pthis.closing)
                            pthis.my_setTimeout(
                                pthis.startRegularFunc,
                                pthis.regularFuncMaxTimeout,
                                pthis.env,
                                `CODE00000275`,
                                `JobStorage.startRegularFunc`
                            );
                        return;
                    }
                    if (!job.succeded && !job.paused) await runJob(job);
                    if (pthis.closing) return;
                }
                if (pthis.regularFuncMinTimeout) await awaitDelay(pthis.regularFuncMinTimeout);
            }
        };
        //-------------------------------------------------------------------------------------------------------------------------------
        if (autoStartExistingJobs)
            pthis.my_setTimeout(this.startRegularFunc, 0, pthis.env, `CODE00000276`, `JobStorage.startRegularFunc`);
    }

    loadJobs(iterator: IterableIterator<any>, limitFunc: () => boolean) {
        for (let row of iterator) {
            this.loadJob(row);

            // HINT: Check limit every this every time, because some of the jobs can already be loaded,
            // we don't have any flag in DB which can exclude them
            if (!limitFunc()) return;
        }
    }

    async loadUnload() {
        const ts = moment();
        const tsStr = ts.format();
        // const VERY_LOW = this.maxLoadedJobs * jobsRatio.veryLow;
        const LOW = this.maxLoadedJobs * jobsRatio.low;
        const MID = this.maxLoadedJobs * jobsRatio.mid;
        const HIGH = this.maxLoadedJobs * jobsRatio.high;
        const MAX = this.maxLoadedJobs * jobsRatio.max;

        // Load more jobs if some Jobs are unloaded to DB
        if (!this.nonSuccededJobsFullyLoaded) {
            // First we load ReadyToRun tasks.
            // HINT: We don't care if we have too much tasks here, because readyToRun tasks should always take priority
            // if we looad too many here, than we will unload some OTHER tasks below
            if (this.readyToRunJobs.length < LOW)
                this.loadJobs(
                    this.selectReadyToRunByNextRunTs.iterate(tsStr, MID),
                    () => MID <= this.readyToRunJobs.length
                );

            if (this.loadedJobsCount() < LOW)
                this.loadJobs(this.selectAllNotSucceded.iterate(MID), () => this.loadedJobsCount() <= MID);

            if (this.loadedJobsCount() < LOW) this.nonSuccededJobsFullyLoaded = true;
        }

        // We unload jobs only if we reached MAX
        // But we will unload them until there are less than HIGH jobs left
        // This is because unloading process is quite heavy and we don't want it to occur every time.
        if (this.loadedJobsCount() < MAX) return;

        // Additional check to prevent unloading too often
        if (this.lastUnload && this.lastUnload.diff(ts) < this.minUnloadInterval) return;
        this.lastUnload = ts;

        // First unload jobs which are waiting for time, which won't be needed for quire a long time
        for (let i = this.waitingTimeJobs.length - 1; i >= 0; i--) {
            const job = this.waitingTimeJobs[i];
            if (
                job.nextRunTs &&
                job.nextRunTs.diff(ts) > this.maxAwaitBeforeUnload &&
                job.touchTs.diff(ts) > this.maxAwaitBeforeUnload
            )
                await this.unload(job);
            if (this.loadedJobsCount() <= HIGH) return;
        }

        // Than unload jobs whose deps are not ready and which are not touched for quite long time
        for (let [, job] of this.jobsById)
            if (!job.deps_succeded && ts.diff(job.touchTs) > this.maxAwaitBeforeUnload) {
                await this.unload(job);
                if (this.loadedJobsCount() <= HIGH) return;
            }

        // If we still have too much jobs - unload all non-ready to run by touchTs
        {
            const jobsByTouchTs: Job[] = sortObjects([...this.jobsById.values()], ["touchTs"]);
            for (let i = jobsByTouchTs.length - 1; i >= 0; i--) {
                const job = jobsByTouchTs[i];
                if (!this.readyToRunJobs.includes(job)) {
                    await this.unload(job);
                    if (this.loadedJobsCount() <= HIGH) return;
                }
            }
        }

        // Only ready to run jobs are left, but still too many - unload them by touchTs
        {
            const jobsByTouchTs: Job[] = sortObjects([...this.readyToRunJobs], ["touchTs"]);
            for (let i = jobsByTouchTs.length - 1; i >= 0; i--) {
                const job = jobsByTouchTs[i];
                await this.unload(job);
                if (this.loadedJobsCount() <= HIGH) return;
            }
        }

        this.my_console.error(
            `CODE00000291`,
            `Internal error - Couldn't unload tasks, there are still ${this.loadedJobsCount()} tasks left!`
        );
    }

    onJobStep(job: Job, jobStep: JobStep) {}

    refreshJobsStatus() {
        const pthis = this;
        runOnce(this, 250, function() {
            const ts = moment().format();
            for (let id of pthis.idsTouchedAfterStatus) {
                const job = pthis.jobsById.get(id);
                if (!job) {
                    const jobStatus = pthis.jobsStatus.get(id);
                    if (jobStatus) {
                        jobStatus.updatedTs = ts;
                        jobStatus.deleted = 1;
                        pthis.my_setTimeout(
                            () => {
                                pthis.jobsStatus.delete(id);
                            },
                            pthis.statusTTL,
                            pthis.env,
                            `CODE00000277`,
                            `JobStorage.startRegularFunc`
                        );
                    }
                } else {
                    const { updatedTs, ...oldJobStatus } = pthis.jobsStatus.get(id) || (({} as any) as TJobStatus);
                    const newJobStatus = pthis.jobFieldFuncs.serializeJobStatus(job);
                    if (!updatedTs || !deepEqual(oldJobStatus, newJobStatus)) {
                        newJobStatus.updatedTs = ts;
                        pthis.jobsStatus.set(id, newJobStatus as any);
                    }
                }
            }

            ////////////////////// TODO Закомментить этот блок, если он никогда не останавилвается на Breakpoint'е внутри этого блока START ////////////////////
            const map2 = new Map();
            for (let [, job] of pthis.jobsById) map2.set(job.id, pthis.jobFieldFuncs.serializeJobStatus(job));

            const DBG_RemoveKnownDiffs = (m: any) => {
                const mo = mapToObject(m) as any;
                for (let k in mo) {
                    const o = mo[k];
                    if (o) {
                        delete o.updatedTs;
                        if (o.deleted) delete o[k];
                    }
                }
                return mo;
            };

            const pthis_jobsStatus_as_object = DBG_RemoveKnownDiffs(pthis.jobsStatus);
            const map2_as_object = DBG_RemoveKnownDiffs(map2);

            if (!deepEqual(pthis_jobsStatus_as_object, map2_as_object)) {
                const diff = deepObjectDiff(pthis_jobsStatus_as_object, map2_as_object);

                debugger;
                pthis.my_console.log(`CODE00000185`, `incremental status is from full status!!!`, diff);
            }
            ////////////////////// TODO Закомментить этот блок, если он никогда не останавилвается на Breakpoint'е внутри этого блока END ////////////////////

            pthis.idsTouchedAfterStatus = new Set();
        });
        return pthis.jobsStatus;
    }

    removeJob(job: Job) {
        const sJob = sortKeys(this.jobFieldFuncs.serializeJob(job), { deep: true });

        const key = makeJobKey(job.jobType, sJob.input);
        this.jobsByKey.delete(key);
        this.jobsById.delete(job.id);

        if (!job.jobType.stored) return;
        this.deleteByIdSql.run(key);
        this.idsTouchedAfterStatus.add(job.id);
    }

    async saveJob(job: Job, saveHistory: boolean): Promise<void> {
        const key = makeJobKey(job.jobType, job.input);
        this.jobsByKey.set(key, job);
        this.jobsById.set(job.id, job);

        if (!job.jobType.stored) return;
        this.haveNewSavesFlag = job.timesSaved <= 0;
        job.timesSaved++;
        const sJob = sortKeys(this.jobFieldFuncs.serializeJob(job), { deep: true });
        const sJobArray = this.jobFieldFuncs.serializedToArray(sJob);

        const promise1 = this.replaceBatchWriter.add(sJob.id, sJobArray);
        if (saveHistory && this.historyBatchWriter)
            await this.historyBatchWriter.add(sJob.updatedTs + "-" + sJob.id, [sJob.updatedTs, ...sJobArray]);
        await promise1;
    }

    loadJob(row: any): Job<any, any, any> {
        const existingJob = this.jobsById.get(row.id);
        if (existingJob) return existingJob;

        const job = this.jobFieldFuncs.deserializeJob(this, row);
        this.jobsByKey.set(job.key, job);
        this.jobsById.set(job.id, job);
        for (let handler of job.jobStorage.onJobLoadedHandlers) handler(job, "CODE00000226");
        this.fixJobContainer(job);
        this.touch(job);
        return job;
    }

    findJobByKey(jobType: JobType<any, any, any>, key: JobKey): Job<any, any, any> | undefined {
        const loadedJob = this.jobsByKey.get(key);
        if (loadedJob) return loadedJob;

        if (!jobType.stored) return undefined;
        const rows = this.queryByKeySql.all(key);
        if (rows && rows[0]) return this.loadJob(rows);
        else return undefined;
    }

    findJobById(id: JobId): Job<any, any, any> | undefined {
        const loadedJob = this.jobsById.get(id);
        if (loadedJob) return loadedJob;

        const rows = this.queryByIdSql.all(id);
        if (rows && rows[0]) return this.loadJob(rows);
        else return undefined;
    }

    runningJobsCount() {
        return this.runningJobs.size;
    }

    loadedJobsCount() {
        return this.jobsById.size;
    }

    // Перемещает Job в корректный контейнер.
    fixJobContainer(job: Job) {
        if (job.unloaded) {
            moveToContainer(undefined, job);
        } else if (job.paused) {
            // Job is paused
            moveToContainer(this.pausedJobs, job);
        } else if (job.running) {
            // Job is running
            moveToContainer(this.runningJobs, job);
        } else if (job.nextRunTs && moment().diff(job.nextRunTs) < 0) {
            // Job is waiting for time
            moveToContainer(this.waitingTimeJobs, job);
            sortObjects(this.waitingTimeJobs, "nextRunTs");
        } else if (!checkDeps(job)) {
            // Job is waiting for deps
            moveToContainer(undefined, job);
        } else if (!job.succeded) {
            // Job is ready to run
            moveToContainer(this.readyToRunJobs, job);
        } else {
            // Job is succeded
            moveToContainer(undefined, job);
        }
    }

    pickReadyToRun(): Job | undefined {
        const r = this.readyToRunJobs.splice(0, 1)[0];
        if (r) r.container = undefined;
        return r;
    }

    startNow(job: Job) {
        if (!job.running) {
            this.touch(job);
            job.paused = false;
            job.nextRunTs = moment();
            this.fixJobContainer(job);
        }
    }

    pause(job: Job) {
        this.touch(job);
        job.paused = true;
    }

    resume(job: Job) {
        this.touch(job);
        job.paused = false;
        this.fixJobContainer(job);
    }

    touch(job: Job) {
        job.touchTs = moment();
        this.idsTouchedAfterStatus.add(job.id);
    }

    async unload(job: Job) {
        if (!job.unloaded && !job.running) {
            this.touch(job);
            await this.saveJob(job, false);
            job.unloaded = true;
            this.fixJobContainer(job);
            this.jobsById.delete(job.id);
            this.jobsByKey.delete(job.key);
        }
    }

    close() {
        this.closing = true;
    }

    async iterateJobs(dbWhereCondition: string | undefined, callback: IterateJobsCallback) {
        const pthis = this;
        if (dbWhereCondition) {
            const stmt = this.db.prepare(
                `select * from ${pthis.tableName} where ${dbWhereCondition} order by priority desc`
            );
            for (let row of stmt.iterate()) {
                const job = this.loadJob(row);
                await callback(job);

                while (pthis.loadedJobsCount() > pthis.maxLoadedJobs + 1) await awaitDelay(pthis.regularFuncMinTimeout);
            }
        } else {
            for (let [, job] of pthis.jobsById) {
                await callback(job);
                while (pthis.loadedJobsCount() > pthis.maxLoadedJobs + 1) await awaitDelay(pthis.regularFuncMinTimeout);
            }
        }
    }

    // clear(type?: PermanentVaultType | undefined) {
    //     if (type) this.deleteAllTypeSql.run(type);
    //     else this.deleteAllSql.run();
    // }

    // loadAll() {
    //     const r0 = this.queryAllSql.all();
    //     const r = r0.map(row => JSON.parse(row.json));
    //     return r;
    // }
}
