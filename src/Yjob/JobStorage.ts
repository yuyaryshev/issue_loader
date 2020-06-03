import { Database, Statement } from "better-sqlite3";
import { awaitDelay, EnvWithTimers, moveToContainer, Severity, sortObjects } from "Ystd";

import {
    DefaultJobContextStatus,
    defaultJobContextFieldFuncs,
    defaultJobFieldFuncs,
    defaultJobResultFieldFuncs,
    DefaultJobStatus,
    DefaultSerializedJob,
    DefaultSerializedJobContext,
} from "./JobFieldsServer";

import moment from "moment";
import sortKeys from "sort-keys";
import { Job, JobId } from "./Job";
import { JobType } from "./JobType";
import { JobStep } from "./JobStep";
import { batchWriter, BatchWriter } from "Yjob/batchWriter";
import { JobContext, JobContextId, JobContextKey } from "Yjob/JobContext";
import { JobContextType } from "Yjob/JobContextType";
import { startJobs } from "Yjob/mainLogic_startJobs";
import { loadUnload } from "Yjob/mainLogic_loadUnload";
import { JobState, JobStats, makeJobStats } from "Yjob/JobState";
import { JobResources } from "Yjob/JobResources";
import { checkPredecessors } from "Yjob/predecessors";
import { JobLogItem } from "Yjob/JobLogItem";

// @ts-ignore
require("moment-countdown");

export type PermanentVaultId = string;
export type PermanentVaultType = string;
export type PermanentVaultPriority = string | number | undefined;
export type PermanentVaultJson = string;

// interface DefaultJobStatusWithUpdatedTs extends DefaultJobStatus{
//     updatedTs?:string;
// }

export interface JobContextFieldFuncs<
    //    TJobStatus extends DefaultJobStatus = DefaultJobStatus,
    TSerializedJobContext extends DefaultSerializedJobContext = DefaultSerializedJobContext,
    TJobContextStatus extends DefaultJobContextStatus = DefaultJobContextStatus
> {
    jobContextColumnStr: string;
    jobContextColumnPlaceholderStr: string;
    jobContextMemColumnStr: string;
    jobContextMemColumnPlaceholderStr: string;
    rowToSerialized: (row: any) => TSerializedJobContext;
    deserialize: (jobStorage: JobStorage<any, any, any, any, any>, serialized: TSerializedJobContext) => JobContext;
    serializeToArray: (o: TSerializedJobContext) => any[];
    serializeMemToArray: (o: any) => any[];
    serialize: (jobContext: JobContext) => TSerializedJobContext;
    serializeMem: (jobContext: JobContext) => any;
    serializeStatus: (jobContext: JobContext) => TJobContextStatus;
}

export interface JobFieldFuncs<
    //    TJobStatus extends DefaultJobStatus = DefaultJobStatus,
    TSerializedJob,
    TJobStatus
> {
    jobColumnStr: string;
    jobColumnPlaceholderStr: string;
    jobMemColumnStr: string;
    jobMemColumnPlaceholderStr: string;
    rowToSerialized: (row: any) => TSerializedJob;
    deserialize: (
        jobStorage: JobStorage<any, any, any, any, any>,
        serialized: TSerializedJob,
        jobContext: JobContext
    ) => Job;
    serializeToArray: (o: TSerializedJob) => any[];
    //serializeMemToArray: (o: any) => any[];
    serialize: (job: Job) => TSerializedJob;
    //serializeMem: (job: Job) => any;
    serializeStatus: (job: Job) => TJobStatus;
}

export interface JobResultFieldFuncs<
    //    TJobStatus extends DefaultJobStatus = DefaultJobStatus,
    TSerializedJob,
    TJobStatus
> {
    jobResultColumnStr: string;
    jobResultColumnPlaceholderStr: string;
    jobResultMemColumnStr: string;
    jobResultMemColumnPlaceholderStr: string;
    //rowToSerialized: (row: any) => TSerializedJob;
    deserialize: (jobStorage: JobStorage<any, any, any, any, any>, serialized: TSerializedJob, job: Job) => Job;
    //serializeToArray: (o: TSerializedJob) => any[];
    //serializeMemToArray: (o: any) => any[];
    serialize: (job: Job) => TSerializedJob;
    //serializeMem: (job: Job) => any;
    //serializeStatus: (job: Job) => TJobStatus;
}

export interface JobErrorResolution {
    persistentError?: boolean;
}

export type JobLogger = (logItem: JobLogItem, job: Job) => void | Promise<void>;

export interface JobStorageSettings<
    Env,
    TSerializedJobContext extends DefaultSerializedJobContext = DefaultSerializedJobContext,
    TJobContextStatus extends DefaultJobContextStatus = DefaultJobContextStatus,
    TSerializedJob extends DefaultSerializedJob = DefaultSerializedJob,
    TJobStatus extends DefaultJobStatus = DefaultJobStatus
> {
    env: Env;
    db: Database;
    historyDb?: Database;
    tableName?: string;
    historyTableName?: string;
    bulkSize?: number;
    batchTimeout?: number;
    allJobTypes: AllJobTypesBase;
    allJobContextTypes: AllJobContextTypesBase;
    maxLoadedJobs?: number;
    autoStartRegularFunc?: boolean;
    regularFuncBulk?: number;
    regularFuncMinTimeout?: number;
    maxAwaitBeforeUnload?: number;
    regularFuncMaxTimeout?: number;
    minUnloadInterval?: number;
    statusTTL?: number;
    console?: any;
    setTimeout?: any;
    jobContextFieldFuncs?: JobContextFieldFuncs<TSerializedJobContext, TJobContextStatus>;
    errorStateChanged?: (error: Error | undefined) => void | Promise<void>;
    noBatchMode?: boolean;
    jobResourcesLimits?: JobResources;
    jobResourcesDelays?: JobResources;
    onJobError?: (job: Job, errorMessage: string) => JobErrorResolution | undefined;
    jobLogger?: JobLogger;
}

export const defaultJobStorageSettings = {
    tableName: "jobContexts",
    jobTableName: "jobs",
    jobResultTableName: "jobResult",
    historyTableName: "job_history",
    bulkSize: 25,
    maxLoadedJobs: 1000,
    autoStartRegularFunc: true,
    regularFuncBulk: 10,
    regularFuncMinTimeout: 10,
    maxAwaitBeforeUnload: 60 * 1000,
    regularFuncMaxTimeout: 10,
    minUnloadInterval: 500,
    statusTTL: 60 * 1000,
    jobContextFieldFuncs: defaultJobContextFieldFuncs,
    jobFieldFuncs: defaultJobFieldFuncs,
    jobResultFieldFuncs: defaultJobResultFieldFuncs,
    batchTimeout: 5 * 1000,
};

export interface AllJobTypesBase {
    [key: string]: JobType<any, any, any, any, any, any, any, any, any>;
}

export interface AllJobContextTypesBase {
    [key: string]: JobContextType<any, any, any>;
}

export interface PermanentVaultObject {
    id: string;
    type: string;
    priority?: string | number | undefined;
}

export type JobContextEventHandler = (jobContext: JobContext, cpl: string) => void;
export type JobRunEventHandler = (job: Job, cpl: string) => void;
export type IterateJobContextsCallback = (jobContext: JobContext) => void | Promise<void>;
export type IterateJobsCallback = (job: Job) => void | Promise<void>;

export interface StartLock {
    cpl: string;
    c: number;
    expire: moment.Moment;
    id?: number;
}

export class JobStorage<
    Env extends EnvWithTimers,
    TSerializedJobContext extends DefaultSerializedJobContext = DefaultSerializedJobContext,
    TJobContextStatus extends DefaultJobContextStatus = DefaultJobContextStatus,
    TSerializedJob extends DefaultSerializedJob = DefaultSerializedJob,
    TJobStatus extends DefaultJobStatus = DefaultJobStatus
> {
    readonly env: Env;
    readonly allJobTypes: AllJobTypesBase;
    readonly allJobContextTypes: AllJobContextTypesBase;
    maxContextsInMem: number;
    readonly startRegularFunc: () => Promise<void> | void;
    readonly regularFuncBulk: number;
    readonly regularFuncMinTimeout: number;
    readonly regularFuncMaxTimeout: number;
    jobStorageRefreshStatusTimer: any | undefined;
    unloadStatusReporterTimer: any | undefined;
    public minUnloadInterval: number;
    public lastUnload?: moment.Moment;
    public closing: boolean;
    public readonly jobStats: JobStats;
    public readonly unloadedJobStats: JobStats;
    jobLogsEnabled: boolean = true;
    onJobError?: (job: Job, errorMessage: string) => JobErrorResolution | undefined;

    haveNewSavesFlag: boolean;

    my_console: any;
    my_setTimeout: any;
    maxAwaitBeforeUnload: number;
    statusTTL: number;
    tableName: string;
    bulkSize: number;
    db: Database;
    historyDb?: Database;
    nonSuccededAreFullyLoaded: boolean;
    statusJobsFullyLoaded: boolean;
    unloading: boolean;

    jobContextById: Map<JobContextId, JobContext>;
    jobContextByKey: Map<JobContextKey, JobContext>;

    readyToRunJobContexts: JobContext[];
    waitingTimeJobContexts: JobContext[];

    jobsStatus: Map<number, TJobContextStatus>;
    onJobContextCreatedHandlers: JobContextEventHandler[];
    onJobContextLoadedHandlers: JobContextEventHandler[];
    onJobContextUnloadedHandlers: JobContextEventHandler[];

    onJobCreatedHandlers: JobRunEventHandler[];
    onJobLoadedHandlers: JobRunEventHandler[];
    onJobStartHandlers: JobRunEventHandler[];
    onJobStopHandlers: JobRunEventHandler[];
    idsTouchedAfterStatus: Set<number>;

    replaceBatchWriter: BatchWriter;
    replaceBatchWriterForJobs: BatchWriter;
    replaceBatchWriterForJobResult: BatchWriter;
    historyBatchWriter: BatchWriter | undefined;

    replaceInMemDb?: Statement<any[]>;
    deleteInMemDb?: Statement<[string]>;

    deleteByIdSql: Statement<[PermanentVaultId]>;
    deleteByKeySql: Statement<[PermanentVaultId]>;
    deleteAllSql: Statement<[]>;
    deleteAllTypeSql: Statement<[PermanentVaultType]>;
    queryAllSql: Statement<[]>;
    queryByIdSql: Statement<[number]>;
    queryByKeySql: Statement<[string]>;
    deleteManySql: Statement<PermanentVaultId[]>;
    selectContextsReadyToRunByNextRunTs: Statement<[string, number]>;
    selectContextsAllNotSucceded: Statement<[number]>;
    selectJobsForContext: Statement<[number]>;
    selectResultForJob: Statement<[number]>;
    jobContextFieldFuncs: JobContextFieldFuncs<TSerializedJobContext, TJobContextStatus>;
    jobFieldFuncs: JobFieldFuncs<any, any>;
    jobResultFieldFuncs: JobResultFieldFuncs<any, any>;
    jobResourcesLimits: JobResources;
    jobResourcesCurrent: JobResources;
    jobResourcesDelays?: JobResources;
    jobLogger?: JobLogger;
    lockId: number = 0;
    startLockDbg?: StartLock;
    startLocks: Set<StartLock>;

    constructor(
        settings: JobStorageSettings<Env, TSerializedJobContext, TJobContextStatus, TSerializedJob, TJobStatus>
    ) {
        let {
            env,
            db,
            historyDb,
            tableName,
            jobTableName,
            jobResultTableName,
            historyTableName,
            bulkSize,
            batchTimeout,
            allJobTypes,
            allJobContextTypes,
            maxAwaitBeforeUnload,
            maxLoadedJobs,
            regularFuncBulk,
            regularFuncMinTimeout,
            regularFuncMaxTimeout,
            autoStartRegularFunc,
            minUnloadInterval,
            statusTTL,
            jobContextFieldFuncs,
            jobFieldFuncs,
            jobResultFieldFuncs,
            errorStateChanged,
            noBatchMode,
            jobResourcesLimits,
            jobResourcesDelays,
            onJobError,
            jobLogger,
        } = Object.assign({}, defaultJobStorageSettings, settings);

        const pthis = this;
        let {
            jobContextColumnStr,
            jobContextColumnPlaceholderStr,
            jobContextMemColumnStr,
            jobContextMemColumnPlaceholderStr,
        } = (this.jobContextFieldFuncs = jobContextFieldFuncs!);

        let { jobColumnStr, jobColumnPlaceholderStr } = (this.jobFieldFuncs = jobFieldFuncs!);

        let { jobResultColumnStr, jobResultColumnPlaceholderStr } = (this.jobResultFieldFuncs = jobResultFieldFuncs!);

        this.jobLogger = jobLogger;
        this.onJobError = onJobError;
        this.my_console = settings.console || console;
        this.my_setTimeout = settings.setTimeout || setTimeout;
        this.jobResourcesLimits = jobResourcesLimits || {};
        this.jobResourcesCurrent = Object.assign({}, this.jobResourcesLimits);
        this.jobResourcesDelays = jobResourcesDelays || {};
        this.startLocks = new Set();

        this.env = env;
        if (regularFuncBulk < 1) {
            pthis.my_console.warn(`CODE00000330`, `JobStorage.regularFuncBulk can't be less than 1! Reset to 1`);
            regularFuncBulk = 1;
        }

        if (maxLoadedJobs < 10) {
            pthis.my_console.warn(`CODE00000209`, `JobStorage.maxLoadedJobs can't be less than 10! Reset to 10`);
            maxLoadedJobs = 10;
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
        this.maxContextsInMem = maxLoadedJobs;
        this.regularFuncBulk = regularFuncBulk;
        this.regularFuncMinTimeout = regularFuncMinTimeout;
        this.regularFuncMaxTimeout = regularFuncMaxTimeout;
        this.allJobTypes = allJobTypes;
        this.allJobContextTypes = allJobContextTypes;
        this.tableName = tableName;
        this.bulkSize = bulkSize;
        this.jobsStatus = new Map();
        this.jobContextById = new Map();
        this.jobContextByKey = new Map();
        this.db = db;
        this.historyDb = historyDb;
        this.maxAwaitBeforeUnload = maxAwaitBeforeUnload;
        this.readyToRunJobContexts = [];
        this.waitingTimeJobContexts = [];
        this.idsTouchedAfterStatus = new Set();
        this.closing = false;
        this.nonSuccededAreFullyLoaded = false;
        this.statusJobsFullyLoaded = false;
        this.onJobContextCreatedHandlers = [];
        this.onJobContextLoadedHandlers = [];
        this.onJobContextUnloadedHandlers = [];
        this.onJobCreatedHandlers = [];
        this.onJobLoadedHandlers = [];
        this.onJobStartHandlers = [];
        this.onJobStopHandlers = [];
        this.jobStats = makeJobStats();
        this.unloadedJobStats = makeJobStats();
        this.unloading = false;

        // -------------------- db (stg) ------------------------------------------------
        db.exec(
            `create table if not exists ${tableName} (${jobContextColumnStr.replace(
                "id,",
                "id INTEGER PRIMARY KEY, "
            )})`
        );
        //db.exec(`create unique index if not exists ix_${tableName}_key on ${tableName}(id)`);

        db.exec(
            `create table if not exists ${jobTableName} (${jobColumnStr.replace("id,", "id INTEGER PRIMARY KEY, ")})`
        );
        //db.exec(`create unique index if not exists ix_${jobTableName}_key on ${jobTableName}(id)`);

        db.exec(
            `create table if not exists ${jobResultTableName} (${jobResultColumnStr.replace(
                "id,",
                "id INTEGER PRIMARY KEY, "
            )})`
        );

        let memTableName: string | undefined = `mem.${tableName}`;
        try {
            db.exec(`attach ':memory:' as mem`);
        } catch (e) {
            if (!e.message.includes("already"))
                this.my_console.error(`CODE00000214`, `Failed to attach 'mem' database to sqlite!`);
        }

        let localJobContextColumnStr = jobContextMemColumnStr.replace("updatedTs", "updated updatedTs");
        try {
            db.exec(`create table if not exists ${memTableName!} (${jobContextMemColumnStr}, primary key(id))`);
            db.exec(`create unique index if not exists mem.ix_mem_${tableName}_key on ${tableName}(key)`);
            db.exec(`create temp view all_${tableName!} as 
            select ${jobContextMemColumnStr}, case when prevError is null then 0 else 1 end hasError, 1 as loaded from ${memTableName} 
            union all
            select ${localJobContextColumnStr}, case when prevError is null then 0 else 1 end hasError, 0 as loaded from main.${tableName} where id not in (select id from ${memTableName} ) 
            `);
        } catch (e) {
            this.my_console.log(`CODE00000215`, `ERROR` + e);
            memTableName = undefined;
        }

        if (this.bulkSize < 1 || this.bulkSize > 2000000000)
            throw new Error(`Invalid bulkSize, should be in interval 1..2000000000, use 1 to disable bulk operations`);

        this.replaceBatchWriter = batchWriter({
            env,
            db,
            tableName,
            columnsStr: jobContextColumnStr,
            placeholdersStr: jobContextColumnPlaceholderStr,
            batchSize: bulkSize,
            timeout: batchTimeout,
            errorStateChanged,
            noBatchMode,
        });

        this.replaceBatchWriterForJobs = batchWriter({
            env,
            db,
            tableName: jobTableName,
            columnsStr: jobColumnStr,
            placeholdersStr: jobColumnPlaceholderStr,
            batchSize: bulkSize,
            timeout: batchTimeout,
            errorStateChanged,
            noBatchMode,
        });

        this.replaceBatchWriterForJobResult = batchWriter({
            env,
            db,
            tableName: jobResultTableName,
            columnsStr: jobResultColumnStr,
            placeholdersStr: jobResultColumnPlaceholderStr,
            batchSize: bulkSize,
            timeout: batchTimeout,
            errorStateChanged,
            noBatchMode,
        });

        if (memTableName) {
            this.replaceInMemDb = db.prepare(
                `replace into ${memTableName}(${jobContextMemColumnStr}) values (${jobContextMemColumnPlaceholderStr})`
            );
            this.deleteInMemDb = db.prepare(`delete from ${memTableName} where id = ?`);
        }

        this.deleteByIdSql = db.prepare(`delete from ${tableName} where id = ?`);
        this.deleteByKeySql = db.prepare(`delete from ${tableName} where key = ?`);

        const deleteManyParamItems = [];
        for (let i = 0; i < this.bulkSize; i++) deleteManyParamItems.push("?");
        this.deleteManySql = db.prepare(`delete from ${tableName} where id in (${deleteManyParamItems.join(",")})`);

        this.deleteAllSql = db.prepare(`delete from ${tableName}`);
        this.deleteAllTypeSql = db.prepare(`delete from ${tableName} where jobContextType = ?`);
        this.queryAllSql = db.prepare(`select * from ${tableName} order by priority desc`);
        this.queryByIdSql = db.prepare(`select * from ${tableName} where id = ?`);
        this.queryByKeySql = db.prepare(`select * from ${tableName} where key = ?`);

        this.selectContextsReadyToRunByNextRunTs = db.prepare(
            `select * from ${tableName} where succeded = 0 and predecessorsDone = 1 and (nextRunTs is null or nextRunTs < ?) order by nextRunTs limit ?`
        );
        this.selectJobsForContext = db.prepare(`select * from ${jobTableName} where jobContextId = ?`);

        this.selectResultForJob = db.prepare(`select * from ${jobResultTableName} where id = ?`);

        this.selectContextsAllNotSucceded = db.prepare(`select * from ${tableName} where succeded = 0 limit ?`);
        // -------------------- historyDb ------------------------------------------------
        if (historyDb) {
            try {
                historyDb.exec(`create table ${historyTableName} (ts, ${jobContextColumnStr}, primary key(id,ts))`);
            } catch (e) {}
            this.historyBatchWriter = batchWriter({
                env,
                db: historyDb,
                operator: "insert into ",
                tableName: historyTableName,
                columnsStr: "ts, " + jobContextColumnStr,
                placeholdersStr: "?, " + jobContextColumnPlaceholderStr,
                batchSize: bulkSize,
                errorStateChanged,
                noBatchMode,
            });
        }

        //-------------------------------------------------------------------------------------------------------------------------------
        this.startRegularFunc = async function jobStorageRegularFunc() {
            await loadUnload(pthis); // Jobs are only loaded or unloaded once per regularFuncMaxTimeout
            await startJobs(pthis);
        };
        //-------------------------------------------------------------------------------------------------------------------------------
        if (autoStartRegularFunc)
            pthis.my_setTimeout(this.startRegularFunc, 0, pthis.env, `CODE00000276`, `JobStorage.startRegularFunc`);
    }

    toggleJobLogs(v: boolean) {
        this.jobLogsEnabled = v;
    }

    loadJobResult(iterator: IterableIterator<any>, job: Job) {
        //this.loadJobResult(this.selectResultForJob.iterate(row.id), job);
        for (let row of iterator) {
            job.result = row.result;
        }
    }

    loadResult(iterator: IterableIterator<any>) {
        //this.loadResult(this.selectResultForJob.iterate(row.id), job);
        for (let row of iterator) {
            return JSON.parse(row.result);
        }
    }

    loadJobs(iterator: IterableIterator<any>, contextRow: any) {
        let jobsById: any = {};
        for (let row of iterator) {
            jobsById[row.id] = Object.assign(row, { jobType: row.key });
        }
        return Object.keys(jobsById).length ? JSON.stringify(jobsById) : undefined;
    }

    loadJobContexts(iterator: IterableIterator<any>, limitFunc: () => boolean, stmtForJob: Statement) {
        for (let row of iterator) {
            //row.jobsById = this.loadJobs(stmtForJob.iterate(row.id), row);
            this.loadJobContext(row);

            // HINT: Check limit every this every time, because some of the jobs can already be loaded,
            // we don't have any flag in DB which can exclude them
            if (!limitFunc()) return;
        }
    }

    onJobStep(job: Job, jobStep: JobStep) {
        if (this.jobLogsEnabled && this.jobLogger)
            this.jobLogger(
                {
                    cpl: jobStep.cpl,
                    message: undefined,
                    severity: jobStep.severity,
                    jobId: job.id + "",
                    type: job.jobType.type,
                    name: undefined,
                    step: jobStep.step,
                    prevError: job.prevError,
                    finished: jobStep.finished ? 1 : 0,
                    ready: 1, // job.readyToRun,
                    waitType: jobStep.waitType,
                    project: (job.jobContext as any).project, // wa
                    issueKey: (job.jobContext as any).issueKey, // wa
                } as JobLogItem,
                job
            );
    }

    refreshJobsStatus() {
        return this.jobsStatus;
    }

    async saveJobResult(job: Job): Promise<void> {
        if (job.result) {
            const serialize = (): any[] => {
                return [job.id, JSON.stringify(job.result)];
            };
            const promise2 = this.replaceBatchWriterForJobResult.add(job.id.toString(), serialize as any);
            await promise2;
        }
    }

    async saveJob(job: Job): Promise<void> {
        const serialize = (): any[] => {
            const sJobContext = sortKeys(this.jobFieldFuncs.serialize(job), { deep: true });
            const sJobContextArray = this.jobFieldFuncs.serializeToArray(sJobContext);
            return sJobContextArray;
        };

        const promise2 = this.replaceBatchWriterForJobs.add(job.id.toString(), serialize as any);
        await promise2;
    }

    async saveJobContext(jobContext: JobContext, saveHistory: boolean): Promise<void> {
        const serializeContext = (): any[] => {
            this.haveNewSavesFlag = jobContext.timesSaved <= 0;
            jobContext.timesSaved++;
            const sJobContext = sortKeys(this.jobContextFieldFuncs.serialize(jobContext), { deep: true });
            const sJobContextArray = this.jobContextFieldFuncs.serializeToArray(sJobContext);
            return sJobContextArray;
        };

        const promise1 = this.replaceBatchWriter.add(jobContext.id.toString(), serializeContext as any);
        // TODO FUTURE - возможно вернуть запись истории
        // if (saveHistory && this.historyBatchWriter)
        //     await this.historyBatchWriter.add(sJobContext.updatedTs + "-" + sJobContext.id, [
        //         sJobContext.updatedTs,
        //         ...sJobContextArray,
        //     ]);
        await promise1;

        for (let i of Object.keys(jobContext.jobsById)) {
            this.saveJob(jobContext.jobsById[i]);
            this.saveJobResult(jobContext.jobsById[i]);
        }
    }

    saveJobContextMem(jobContext: JobContext): void {
        if (!this.replaceInMemDb) return;
        const pthis = this;
        setImmediate(function doSaveJobContextMem() {
            const sJobContext = pthis.jobContextFieldFuncs.serializeMem(jobContext);
            if (!sJobContext.unloaded) {
                const sJobContextArray = pthis.jobContextFieldFuncs.serializeMemToArray(sJobContext);
                pthis.replaceInMemDb!.run(sJobContextArray);
            } else pthis.deleteInMemDb!.run(sJobContext.id);
        });
    }

    changeUnloadedStats(state: JobState, n: number) {
        this.unloadedJobStats[state] += n;
    }

    loadJobContext(row: any): JobContext {
        const existingJob = this.jobContextById.get(row.id);
        if (existingJob) return existingJob;
        row.jobsById = this.loadJobs(this.selectJobsForContext.iterate(row.id), row);
        const serialized: TSerializedJobContext = this.jobContextFieldFuncs.rowToSerialized(row);

        // for (let serializedJob of Object.values(row.jobsById) as TSerializedJob[])
        //     this.changeUnloadedStats(serializedJob.state, -1);

        const jobContext = this.jobContextFieldFuncs.deserialize(this, serialized);
        this.jobContextByKey.set(jobContext.key, jobContext);
        this.jobContextById.set(jobContext.id, jobContext);
        for (let handler of jobContext.jobStorage.onJobContextLoadedHandlers) handler(jobContext, "CODE00000292");
        for (let job of jobContext.jobsArray()) this.updateJobState(job);

        this.touch(jobContext);
        return jobContext;
    }

    findOrLoadJobContextByKey(jobContextKey: JobContextKey): JobContext | undefined {
        const loadedJobContext = this.jobContextByKey.get(jobContextKey);
        if (loadedJobContext) return loadedJobContext;

        const rows = this.queryByKeySql.all(jobContextKey);

        // TODO всегда ли нужно дергать базу, когда id не найден?
        if (rows && rows[0]) return this.loadJobContext(rows[0]);
        else return undefined;
    }

    // findJobByKey(jobType: JobType<any, any, any>, key: JobKey): Job<any, any, any> | undefined {
    //     const loadedJob = this.jobContextByKey.get(key);
    //     if (loadedJob) return loadedJob;
    //
    //     const rows = this.queryByKeySql.all(key);
    //     if (rows && rows[0]) return this.loadJob(rows[0]);
    //     else return undefined;
    // }

    findJobById(contextId: JobContextId, jobId: JobId): Job<any, any, any> | undefined {
        const loadedJobContext = this.jobContextById.get(jobId);
        if (loadedJobContext) return loadedJobContext.getJobById(jobId);

        const rows = this.queryByIdSql.all(jobId);
        if (rows && rows[0]) return this.loadJobContext(rows).getJobById(jobId);
        return undefined;
    }

    runningJobsCount() {
        // TODO fix jobStats!
        //return this.jobStats.running;
        let cnt = 0;
        for (let c of this.jobContextById.values()) for (let j of c.jobsArray()) if (j.running) cnt++;
        return cnt;
    }

    runningContextsCount() {
        // TODO fix jobStats!
        //return this.jobStats.running;
        let cnt = 0;
        for (let c of this.readyToRunJobContexts.values())
            for (let j of c.jobsArray())
                if (j.running) {
                    cnt++;
                    break;
                }
        return cnt;
    }

    loadedJobsCount() {
        return this.jobContextById.size;
    }

    // Перемещает Job в корректный контейнер.
    updateJobState(job: Job) {
        let newState: JobState;
        if (job.unloaded) {
            newState = "unloaded";
        } else if (job.paused) {
            newState = "paused";
        } else if (job.running) {
            newState = "running";
        } else if (job.nextRunTs && moment().diff(job.nextRunTs) < 0) {
            newState = "waitingTime";
        } else if (!checkPredecessors(job)) {
            newState = "waitingDeps";
        } else if (job.succeded) {
            newState = "succeded";
        } else {
            newState = "readyToRun";
        }

        if (job.state !== newState) {
            if (job.state !== "unloaded") {
                this.jobStats[job.state]--;
            }

            job.state = newState;

            if (job.state !== "unloaded") {
                this.jobStats[job.state]++;
            }
        }

        job.jobContext.refreshState();

        if (job.jobContext.hasReadyToRun()) {
            moveToContainer(this.readyToRunJobContexts, job.jobContext);
        } else if (job.jobContext.hasWaitingTimeJobs()) {
            moveToContainer(this.waitingTimeJobContexts, job.jobContext);
            sortObjects(this.waitingTimeJobContexts, "nextRunTs");
        } else moveToContainer(undefined, job.jobContext);
    }

    startNow(job: Job) {
        if (!job.running) {
            this.touch(job.jobContext);
            job.paused = false;
            job.nextRunTs = moment();
            this.updateJobState(job);
        }
    }

    pause(job: Job) {
        this.touch(job.jobContext);

        job.paused = true;
    }

    resume(job: Job) {
        this.touch(job.jobContext);

        job.paused = false;
        this.updateJobState(job);
    }

    touch(jobContext: JobContext) {
        jobContext.touchTs = moment();
        this.idsTouchedAfterStatus.add(jobContext.id);
    }

    async unloadException(job: Job) {
        this.my_console.error(`CODE00000216`, `unloadException - not implemented!`);
    }

    async unload(jobContext: JobContext) {
        if (!jobContext.unloaded && !jobContext.running) {
            this.touch(jobContext);
            await this.saveJobContext(jobContext, false);
            for (let job of jobContext.jobsArray()) {
                this.changeUnloadedStats(job.state, 1);
                job.unloaded = true;
                this.updateJobState(job);
            }

            jobContext.unloaded = true;
            this.jobContextById.delete(jobContext.id);
            this.jobContextByKey.delete(jobContext.key);

            const contextIndex = this.readyToRunJobContexts.indexOf(jobContext);
            if (contextIndex >= 0) this.readyToRunJobContexts.splice(contextIndex, 1);

            const contextIndex2 = this.waitingTimeJobContexts.indexOf(jobContext);
            if (contextIndex2 >= 0) this.waitingTimeJobContexts.splice(contextIndex2, 1);

            this.saveJobContextMem(jobContext);
        }
    }

    close() {
        this.closing = true;
    }

    async iterateJobContexts(dbWhereCondition: string | undefined, callback: IterateJobContextsCallback) {
        const pthis = this;
        if (dbWhereCondition) {
            const stmt = this.db.prepare(
                `select * from ${pthis.tableName} where ${dbWhereCondition} order by priority desc`
            );
            for (let row of stmt.iterate()) {
                const jobContext = this.loadJobContext(row);
                await callback(jobContext);
                while (pthis.loadedJobsCount() > pthis.maxContextsInMem + 1)
                    await awaitDelay(pthis.regularFuncMinTimeout);
            }
        } else {
            for (let [, jobContext] of pthis.jobContextById) {
                await callback(jobContext);
                while (pthis.loadedJobsCount() > pthis.maxContextsInMem + 1)
                    await awaitDelay(pthis.regularFuncMinTimeout);
            }
        }
    }

    async iterateJobs(dbWhereCondition: string | undefined, callback: IterateJobsCallback) {
        const pthis = this;
        return this.iterateJobContexts(dbWhereCondition, async (jobContext: JobContext) => {
            for (let job of jobContext.jobsArray()) await callback(job);
        });
    }

    nonSuccededJobsCount(): number {
        let c = 0;
        for (let k in this.jobStats) if (k !== "succeded") c += (this.jobStats as any)[k];
        return c;
    }

    insertedNewJob() {}

    usedResources() {
        let st: any = {};
        for (let jobContext of this.jobContextById.values())
            for (let job of jobContext.jobsArray())
                if (job.running) for (let k in job.jobType.resources) st[k] = (st[k] || 0) + job.jobType.resources[k];
        return st;
    }

    lockNewStartsDbg() {
        this.startLockDbg = this.lockNewStarts({
            id: -1,
            c: 1000000000,
            cpl: "CODE00000000",
            expire: moment("5999-01-01"),
        });
    }

    unlockNewStartsDbg() {
        if (this.startLockDbg) {
            this.unlockNewStarts(this.startLockDbg);
            this.startLockDbg = undefined;
        }
    }

    lockNewStarts(lock: StartLock) {
        this.startLocks.add(lock);
        lock.id = this.lockId++;
        this.my_console.log(
            `CODE00000331`,
            `lockNewStarts cpl=${lock.cpl}, id=${lock.id}, c=${lock.c}, expire=${lock.expire.format()}`
        );
        return lock;
    }

    unlockNewStarts(lock: StartLock) {
        this.startLocks.delete(lock);
        this.my_console.log(
            `CODE00000332`,
            `unlockNewStarts cpl=${lock.cpl}, id=${lock.id}, c=${lock.c}, expire=${lock.expire.format()}`
        );
    }

    testNewStartsLock(lock: StartLock) {
        if (moment().diff(lock.expire) >= 0) {
            this.my_console.warn(
                `CODE00000333`,
                `testNewStartsLock LOCK EXPIRED! cpl=${lock.cpl}, id=${lock.id}, c=${
                    lock.c
                }, expire=${lock.expire.format()}`
            );
            this.startLocks.delete(lock);
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
