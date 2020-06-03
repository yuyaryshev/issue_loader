import { SqliteLog, SqliteLogItem } from "../YsqlLog/SqliteLog";
import { IssueLoaderStatus, makeStatus } from "./IssueLoaderStatus";
// @ts-ignore
import exitHook from "async-exit-hook";

import better_sqlite3 from "better-sqlite3";
import deepMerge from "deepmerge";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
    debugMsgFactory,
    IntIdManagerForSqlite,
    manageableSetTimeout,
    manageableTimer,
    ManageableTimer,
    yconsole,
    YConsoleMsg,
} from "Ystd";
import oracledb from "oracledb";
import {
    dbdDChangelogItemInput,
    dbdDChangeLogItemInputLog,
    dbdDCommentItemInput,
    dbdDCommentItemInputLog,
    dbdDJiraFieldInput,
    dbdDLabelInput,
    dbdDLabelInputLog,
    dbdDLinkItemInput,
    dbdDLinkItemInputLog,
    dbdDLinkTypeInput,
    dbdDUserInput,
    dbdDWorklogItemInput,
    dbdDWorklogItemInputLog,
    dbdJiraIssueInput,
    dbdJiraIssueInputLog,
    dbdLoadStreamInput,
    DChangelogItem,
    DCommentItem,
    DJiraField,
    DJiraFieldMarkedMeta,
    DJiraIssue,
    DLabel,
    DLinkItem,
    DLinkType,
    DUser,
    DWorklogItem,
    LoadStream,
    prepareDbDomain,
    PreperedDbDomain,
    readDJiraFieldMarkedMeta,
} from "dbDomains";
import { JiraRequest, JiraRequestHandler, JiraStubInterface, JiraStubOptions, JiraWrapper, makeJiraStub } from "Yjira";
import { ymutex } from "../Ystd/ymutex";
import { awaitDelay, Job, JobErrorResolution, jobListLogColumnStr, JobLogItem, JobResources, JobStorage } from "Yjob";
import { genericLogColumnStr, GenericLogItem } from "./genericLog";
import { allJobContextTypes, allJobTypes } from "job";
import {
    JobContextStatus,
    jobContextFieldFuncs,
    JobStatus,
    SerializedJob,
    SerializedJobContext,
} from "../job/JobFieldsServer";
import { OracleConnection0 } from "Yoracle";
import { makeOracleBatchWriter, OracleBatchWriter } from "./oracleBatchWriter";
import moment from "moment";
import { issuesToJobs } from "../entry_scripts";
//import set = Reflect.set;

const debug = debugMsgFactory("startup");

export type StartMode = "init" | "deploy" | "run" | "reload" | "drop_all" | "test" | "debugfm";

export interface globalMessagesObj {
    oracle: string;
    sqllite: string;
    jira: string;
}

export interface StartOptions {
    noDbTest?: boolean;
    noJiraTest?: boolean;
    args?: any;
    debugMode?: boolean;
    noBatchMode?: boolean;
}

export interface JiraSettings {
    protocol: string;
    port: number;
    host: string;
    basic_auth: {
        username: string;
        password: string;
    };
    strictSSL?: boolean;
}

export interface OracleSettings {
    user: string;
    password: string;
    connectString: string;
    schema?: string;
}

export interface EnvSettingsTimeouts {
    workCycle: number;
    dbRetry: number;
    jiraIncrFallbackOffset: [number, "years" | "months" | "days" | "hours" | "minutes" | "seconds"];
}

export interface DebugSettings {
    issueKey: string;
    clearCaches: boolean;
}

export interface CacheSettings {
    enabled: boolean;
    file: string;
    minutesToLive: number | undefined;
}

export interface EnvSettings {
    sqlite_stg: string;
    sqlite_history: string;
    sqlite_log: string;
    ignoredJiraFields?: string[];
    jiraMaxResults: number;
    jiraMaxConnections: number;
    jiraMaxConnectionsTimeSpan: number;
    jiraFullLoadBatchSize: number;
    jiraHistDate: string; // Date in iso format
    maxIssuesToStopLoading: number;
    jobResourcesLimits: {
        jira: number;
        cpu: number;
        db: number;
    };
    jobResourcesDelays: {
        jira: number;
        cpu: number;
        db: number;
    };
    dbgStream?: string;
    yyadev?: boolean;
    jira: JiraSettings;
    jiradev?: JiraSettings;
    oracle: OracleSettings;
    connect_jira_dev?: boolean;
    tables: TablesSettings;
    stored_procedures: StoredProcedureSettings;
    timeouts: EnvSettingsTimeouts;
    use_stored_procedures?: boolean;
    debug: DebugSettings;
    monitorEndpointPort: number;
    instanceName: string;
    jiraStub?: JiraStubOptions;
    write_into_log_tables?: boolean;
}

export interface TablesSettings {
    JIRA_FIELD_T_CHANGES: string;
    JIRA_FIELD_T: string;
    ISSUE_T_CHANGES: string;
    ISSUE_T: string;
    ISSUE_T_OLD: string;
    WORKLOG_T_CHANGES: string;
    WORKLOG_T: string;
    LINK_T_CHANGES: string;
    LINK_T: string;
    LOAD_STREAM_T: string;
    CURRENT_JIRA_FIELD_T: string;
}

export interface StoredProcedureSettings {
    HANDLE_JIRA_FIELD_T_CHANGES: string;
    HANDLE_ISSUE_T_CHANGES: string;
}

export interface oracleSchedulerT {
    nextTimeCallFunction?: moment.Moment;
    startScheduler: () => Promise<void>;
    oracleProcedure: () => Promise<void>;
}

export class OracleScheduler {
    nextTimeCallFunction?: moment.Moment;
    startScheduler: () => Promise<void>;
    oracleProcedure: () => Promise<void>;

    constructor(dbProvider: any, db: any, schema: any) {
        this.nextTimeCallFunction = undefined;
        this.startScheduler = async () => {
            if (!this.nextTimeCallFunction || this.nextTimeCallFunction.diff(moment()) < 0) {
                this.nextTimeCallFunction = moment().add(10, "seconds");
                setTimeout(this.oracleProcedure, 10000);
            }
        };
        this.oracleProcedure = async () => {
            await dbProvider(async function(db: OracleConnection0) {
                const r = await db.execute(
                    `begin
                      ${schema}.issue_loader_done();
                    end;`,
                    [] // bind value for :id
                );
            });
        };
    }
}

export class SequenceTS {
    currNumber: number;
    nextValue: () => string;

    //currValue: ()=>{};

    constructor() {
        this.currNumber = -1;
        this.nextValue = function() {
            this.currNumber++;
            // 9-значный формат
            if (this.currNumber > 999999999) this.currNumber = 0;
            let strCurrNumber = this.currNumber.toString();
            return ("00000000" + strCurrNumber).substring(strCurrNumber.length - 1);
        };
    }
}

export const defaultSettings = (): EnvSettings => ({
    sqlite_stg: "sqlite_stg.db",
    sqlite_history: "sqlite_history.db",
    sqlite_log: "sqlite_log.db",
    instanceName: "<instanceName not set in settings.json>",
    jiraMaxResults: 1000,
    jiraMaxConnections: 10,
    jiraMaxConnectionsTimeSpan: 1000,
    jiraHistDate: "2019-11-19",
    jiraFullLoadBatchSize: 100,
    maxIssuesToStopLoading: 100,
    jobResourcesLimits: {
        jira: 40,
        cpu: 1,
        db: 100,
    },
    jobResourcesDelays: {
        jira: 1000,
        cpu: 0,
        db: 1000,
    },
    tables: {
        JIRA_FIELD_T_CHANGES: "JIRA_FIELD_T_CHANGES",
        JIRA_FIELD_T: "JIRA_FIELD_T",
        ISSUE_T_CHANGES: "ISSUE_T_CHANGES",
        ISSUE_T: "ISSUE_T",
        ISSUE_T_OLD: "ISSUES_T_OLD",
        WORKLOG_T_CHANGES: "WORKLOG_T_CHANGES",
        WORKLOG_T: "WORKLOG_T",
        LINK_T_CHANGES: "LINK_T_CHANGES",
        LINK_T: "LINK_T",
        LOAD_STREAM_T: "LOAD_STREAM_T",
        CURRENT_JIRA_FIELD_T: "DONT_TOUCH_JIRA_FIELD_T",
    },
    stored_procedures: {
        HANDLE_JIRA_FIELD_T_CHANGES: "HANDLE_JIRA_FIELD_T_CHANGES",
        HANDLE_ISSUE_T_CHANGES: "HANDLE_ISSUE_T_CHANGES",
    },
    jira: {
        protocol: "http",
        port: 80,
        host: "jira.moscow.alfaintra.net",
        basic_auth: {
            username: "username",
            password: "password",
        },
        strictSSL: false,
    },
    oracle: {
        user: "username",
        password: "password",
        connectString: "DWSTPROD_TAF",
    },
    timeouts: {
        workCycle: 10000,
        dbRetry: 10000,
        jiraIncrFallbackOffset: [10, "minutes"],
    },
    debug: {
        issueKey: "",
        clearCaches: false,
    },
    monitorEndpointPort: 29354,
});

export type DbProviderCallback<T> = (db: OracleConnection0) => Promise<T>;

export interface Env {
    better_sqlite3_db: better_sqlite3.Database;
    importExportMode: "" | "import" | "export";
    importExportCurrent: number;
    importExportTotal: number;
    terminating: boolean;
    onTerminateCallbacks: (() => void)[];
    versionStr: string;
    args: any;
    startMode: StartMode;
    settings: EnvSettings;
    jira: JiraWrapper;
    dbProvider: <T>(callback: (db: OracleConnection0) => Promise<T>) => Promise<T>;

    dbdDChangelogItem: PreperedDbDomain<DChangelogItem>;
    dbdDCommentItem: PreperedDbDomain<DCommentItem>;
    dbdDJiraField: PreperedDbDomain<DJiraField>;
    // dbdJiraIssue
    dbdDLabel: PreperedDbDomain<DLabel>;
    dbdDLinkItem: PreperedDbDomain<DLinkItem>;
    dbdLoadStream: PreperedDbDomain<LoadStream>;
    dbdDUser: PreperedDbDomain<DUser>;
    dbdDWorklogItem: PreperedDbDomain<DWorklogItem>;
    dbdDLinkType: PreperedDbDomain<DLinkType>;

    status: IssueLoaderStatus;
    jobLog: SqliteLog<JobLogItem>;
    genericLog: SqliteLog<GenericLogItem>;
    jobStorage: JobStorage<
        EnvWithDbdJiraIssue, // TEnv
        SerializedJobContext, // TSerializedJobContext extends DefaultSerializedJobContext = DefaultSerializedJobContext,
        JobContextStatus, // TJobContextStatus extends DefaultJobContextStatus = DefaultJobContextStatus
        SerializedJob, // TSerializedJob extends DefaultSerializedJob = DefaultSerializedJob,
        JobStatus // TJobStatus extends DefaultJobStatus = DefaultJobStatus,
    >;
    globalMessages: globalMessagesObj;
    debugMode?: boolean;
    timers: Set<ManageableTimer>;
    terminate: (disable_error: boolean) => void | Promise<void>;
    noBatchMode?: boolean;
    oracleBatchWriter: OracleBatchWriter;
    useOracleBatch_REMOVE_THIS_WHEN_DEBUGGED?: boolean;
    oracleScheduler: OracleScheduler;
    sequenceTS: SequenceTS;
    intIdManagerForSqlite: IntIdManagerForSqlite;
}

export interface EnvWithDbdJiraIssue extends Env {
    dbdJiraIssue: PreperedDbDomain<DJiraIssue>;
}

export interface IssueLoaderVersion {
    major?: number;
    minor?: number;
    build?: number;
}

export const startEnv = async (startMode: StartMode, startOptions: StartOptions = {}): Promise<Env> => {
    const pthis = ({
        importExportMode: "",
        importExportCurrent: 0,
        importExportTotal: 0,
        onTerminateCallbacks: [],
        terminating: false,
        timers: new Set(),
        terminate: async function terminate(disable_error: boolean = false) {
            if (!pthis.terminating) {
                if (!disable_error) {
                    if (!pthis.terminating) {
                        yconsole.fatal(`CODE00000327`, `Terminating process!`);
                        for (let callback of pthis.onTerminateCallbacks) callback();
                        pthis.terminating = true;
                        for (let timer of pthis.timers) timer.cancel();
                        yconsole.fatal(`CODE00000328`, `Waiting 10 seconds for io to settle down!`);
                    }
                    await awaitDelay(10000);
                    yconsole.fatal(`CODE00000329`, `Waiting 10 seconds for io to settle down - DONE! Exiting.`);
                } else {
                    yconsole.log(`CODE00000334`, `Terminating process!`);
                    for (let callback of pthis.onTerminateCallbacks) callback();
                    pthis.terminating = true;
                    for (let timer of pthis.timers) timer.cancel();
                }
            }
        },
        useOracleBatch_REMOVE_THIS_WHEN_DEBUGGED: true,
    } as any) as Env;
    (global as any).env = pthis;

    exitHook(pthis.terminate);

    const { args, noDbTest, noJiraTest, debugMode, noBatchMode } = startOptions;
    delete startOptions.args;

    yconsole.log(
        `CODE00000345`,
        `Starting issue_loader, mode = ${startMode}, startOptions = ${JSON.stringify(startOptions)}...`
    );
    const settingsPath = resolve("./settings.json");
    yconsole.log(`CODE00000197`, `settingsPath = ${settingsPath}`);

    const settings = deepMerge(defaultSettings(), JSON.parse(readFileSync(settingsPath, "utf-8")));
    if (settings.monitorEndpointPort)
        yconsole.log(`CODE00000198`, `Monitoring on port ${settings.monitorEndpointPort}`);

    const status = makeStatus();
    const better_sqlite3_db = better_sqlite3(settings.sqlite_stg);

    const better_sqlite3_log = better_sqlite3_db; // better_sqlite3(settings.sqlite_log);
    const jobLog = new SqliteLog<JobLogItem>(better_sqlite3_log, jobListLogColumnStr, {
        table: "job_log",
        groupby: "issuekey",
    });
    const genericLog = new SqliteLog<GenericLogItem>(better_sqlite3_log, genericLogColumnStr, { table: "generic_log" });
    (global as any).jobLog = jobLog;
    (global as any).genericLog = genericLog;

    const better_sqlite3_db_history = settings.sqlite_history ? better_sqlite3(settings.sqlite_history) : undefined;

    let v: IssueLoaderVersion = {};
    try {
        v = JSON.parse(readFileSync("version.json", "utf-8"));
    } catch (e) {
        if (e.code !== "ENOENT") throw e;
    }
    const versionStr = `${v.major || 0}.${v.minor || 0}.${v.build || 0}`;
    yconsole.log(`CODE00000199`, `version = ${versionStr}`);

    debug(`CODE00000306`, `Load settings - finished`);

    debug(`CODE00000307`, `Initializing database domains`);

    const dbdDJiraField = prepareDbDomain(settings, dbdDJiraFieldInput);
    const dbdLoadStream = prepareDbDomain(settings, dbdLoadStreamInput);
    const dbdDUser = prepareDbDomain(settings, dbdDUserInput);
    const dbdDLinkType = prepareDbDomain(settings, dbdDLinkTypeInput);
    // may be _LOG tables
    let dbdDCommentItem = undefined;
    let dbdDChangelogItem = undefined;
    let dbdDLabel = undefined;
    let dbdDWorklogItem = undefined;
    let dbdDLinkItem = undefined;
    if (settings.write_into_log_tables) {
        dbdDCommentItem = prepareDbDomain(settings, dbdDCommentItemInputLog);
        dbdDChangelogItem = prepareDbDomain(settings, dbdDChangeLogItemInputLog);
        dbdDLabel = prepareDbDomain(settings, dbdDLabelInputLog);
        dbdDWorklogItem = prepareDbDomain(settings, dbdDWorklogItemInputLog);
        dbdDLinkItem = prepareDbDomain(settings, dbdDLinkItemInputLog);

        settings.tables.WORKLOG_T = dbdDWorklogItem.name;
        settings.tables.LINK_T = dbdDLinkItem.name;
    } else {
        dbdDCommentItem = prepareDbDomain(settings, dbdDCommentItemInput);
        dbdDChangelogItem = prepareDbDomain(settings, dbdDChangelogItemInput);
        dbdDLabel = prepareDbDomain(settings, dbdDLabelInput);
        dbdDWorklogItem = prepareDbDomain(settings, dbdDWorklogItemInput);
        dbdDLinkItem = prepareDbDomain(settings, dbdDLinkItemInput);
    }

    debug(`CODE00000308`, `dbdDJiraField - OK`);

    if (!noJiraTest)
        yconsole.log(
            `CODE00000309`,
            `Testing Jira connection with '${settings.jira.protocol}' to '${settings.jira.host}:${settings.jira.port}'...`
        );

    function jiraStubHandler(key: string, jiraRequest: JiraRequest, stubGet?: JiraRequestHandler): any {
        // if (jiraRequest.jiraApiPath === "search.search" && jiraRequest.opts.jql.includes("updated"))
        //     return `"{"expand":"schema,names","startAt":0,"maxResults":50,"total":0,"issues":[]}"`;
        return stubGet!(key, jiraRequest);
    }

    let jiraStub: JiraStubInterface | undefined;
    if (settings.jiraStub) {
        if (settings.jiraStub.filename) settings.jiraStub.filename = resolve(settings.jiraStub.filename!);
        jiraStub = makeJiraStub({
            ...settings.jiraStub,
            console: yconsole,
            env: pthis,
            handler: jiraStubHandler,
            errorStateChanged: sqliteErrorStateChanged,
        });
    }

    const jira = new JiraWrapper({
        ...settings,
        jiraStub,
        credentials: settings.jira,
        console: yconsole,
    });

    if (!noJiraTest) {
        const serverInfo = await jira.getServerInfo();
        if (!serverInfo || !serverInfo.version)
            yconsole.error(`CODE00000310`, `Couldn't connect to Jira. Will retry later...`);
        else yconsole.log(`CODE00000311`, `Connected to Jira v${serverInfo.version} - OK`);
    }

    const dbMutex = ymutex();
    const dbProvider = async function<T>(callback: DbProviderCallback<T>) {
        return dbMutex.lock(async function() {
            oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
            const db = ((await oracledb.getConnection(settings.oracle)) as any) as OracleConnection0;
            await db.execute(`alter session set NLS_DATE_FORMAT='YYYY-MM-DD'`);
            await db.execute(`alter session set NLS_TIME_FORMAT='HH24:MI:SSXFF'`);
            await db.execute(`alter session set NLS_TIMESTAMP_FORMAT='YYYY-MM-DD"T"hh24:mi:ss.ff'`);
            await db.execute(`alter session set NLS_TIME_TZ_FORMAT='HH24:MI:SSXFF TZR'`);
            await db.execute(`alter session set NLS_TIMESTAMP_TZ_FORMAT='YYYY-MM-DD"T"hh24:mi:ss.ffTZHTZM'`);
            if (settings.oracle.schema) await db.execute(`ALTER SESSION SET CURRENT_SCHEMA=${settings.oracle.schema}`);

            const r = await callback(db);
            await db.close();
            return r;
        });
    };

    if (!noDbTest) {
        yconsole.log(`CODE00000110`, `Testing Oracle connection '${settings.oracle.connectString}'...`);
        const oracleVersion = await dbProvider(async function(db: OracleConnection0) {
            const r = await db.execute(
                `SELECT * from v$version`,
                [] // bind value for :id
            );
            // @ts-ignore
            return Object.values(r.rows[0])[0] as undefined | string;
        });
        if (!oracleVersion || !oracleVersion.length)
            yconsole.error(`CODE00000111`, `Couldn't connect to Oracle. Will retry later...`);
        else yconsole.log(`CODE00000112`, `Connected to Oracle '${oracleVersion}' - OK`);
    }

    function sqliteErrorStateChanged(error: Error | undefined) {
        // void | Promise<void>
        // TODO env.globalMessages.sqlite = { status: (!error ? "OK" : "Error"), error };
    }

    const jobStorage = new JobStorage<
        EnvWithDbdJiraIssue, // TEnv
        SerializedJobContext, // TSerializedJobContext extends DefaultSerializedJobContext = DefaultSerializedJobContext,
        JobContextStatus, // TJobContextStatus extends DefaultJobContextStatus = DefaultJobContextStatus
        SerializedJob, // TSerializedJob extends DefaultSerializedJob = DefaultSerializedJob,
        JobStatus // TJobStatus extends DefaultJobStatus = DefaultJobStatus,
    >({
        env: pthis as any,
        db: better_sqlite3_db,
        historyDb: better_sqlite3_db_history,
        allJobTypes,
        allJobContextTypes,
        autoStartRegularFunc: false,
        noBatchMode: noBatchMode,
        console: yconsole,
        setTimeout: manageableSetTimeout,
        jobContextFieldFuncs,
        errorStateChanged: sqliteErrorStateChanged,
        jobResourcesLimits: settings.jobResourcesLimits,
        jobResourcesDelays: settings.jobResourcesDelays,
        onJobError: (job: Job, errorMessage: string): JobErrorResolution | undefined => {
            if (errorMessage && errorMessage.includes("ORA-00001"))
                // Unique constraint violation
                return { persistentError: true };
            else if (errorMessage && errorMessage.toLowerCase().includes("too many")) {
                // Too many requests to jira. Ignore this error.
            } else {
                yconsole.error(`CODE00000250`, `Unknown job error: '${errorMessage}'!`);
            }
            return undefined;
        },
        jobLogger: function jobLogger(jobLogItem: JobLogItem, job: Job) {
            jobLog.add(jobLogItem);
        },
    });
    (global as any).jobStorage = jobStorage;
    (global as any).moment = moment;

    const deleteOldLogs = () => {
        try {
            try {
                genericLog.deleteOld();
            } catch (e) {
                yconsole.error(`CODE00000103`, `Couldn't delete old logs because of error: ${e.message}`);
            }
            try {
                jobLog.deleteOld();
            } catch (e) {
                yconsole.error(`CODE00000104`, `Couldn't delete old logs because of error: ${e.message}`);
            }
        } finally {
            manageableTimer(pthis, 4 * 60 * 60 * 1000, "CODE00000100", "deleteOldLogs", deleteOldLogs).setTimeout();
        }
    };
    if (startMode === "run") deleteOldLogs();

    (global as any).logger = (m: YConsoleMsg) => {
        genericLog.add(Object.assign({}, m, { data: m.data && m.data.length ? JSON.stringify(m.data) : "" }));
        return true;
    };

    const globalMessages = { oracle: "ok", sqllite: "ok", jira: "ok" };

    function oracleErrorStateChanged(error: Error | undefined) {
        // void | Promise<void>
        // TODO env.globalMessages.oracle = { status: (!error ? "OK" : "Error"), error };
    }

    const oracleBatchWriter = makeOracleBatchWriter({
        env: pthis as any,
        errorStateChanged: oracleErrorStateChanged,
    });

    debug(`CODE00000101`, `startEnv - finished`);

    let intIdManagerForSqlite: IntIdManagerForSqlite = new IntIdManagerForSqlite(
        jobStorage.db,
        "bufferIds",
        { a: 1, b: 100000000 }, // тут добавить max из таблиц +1
        undefined,
        10
    );

    //nextTimeCallFunction: moment.Moment, oracleProcedure: ()=>{}
    let oracleSchedulerL = new OracleScheduler(
        dbProvider,
        ((await oracledb.getConnection(settings.oracle)) as any) as OracleConnection0,
        settings.oracle.schema
    );

    let SequenceTSL = new SequenceTS();

    return Object.assign(pthis, {
        terminating: false,
        better_sqlite3_db,
        versionStr,
        args,
        startMode,
        settings,
        jira,
        dbProvider,
        dbdDJiraField,
        dbdLoadStream,
        dbdDCommentItem,
        dbdDChangelogItem,
        dbdDUser,
        dbdDLabel,
        dbdDWorklogItem,
        dbdDLinkItem,
        dbdDLinkType,
        status,
        jobLog,
        genericLog,
        jobStorage,
        globalMessages,
        debugMode,
        noBatchMode,
        oracleBatchWriter,
        oracleScheduler: oracleSchedulerL,
        sequenceTS: SequenceTSL,
        intIdManagerForSqlite,
    } as Env);
};

export async function loadDbdIssueFields(env: Env, current: boolean = true): Promise<EnvWithDbdJiraIssue> {
    const table = current ? env.settings.tables.CURRENT_JIRA_FIELD_T : env.settings.tables.JIRA_FIELD_T;
    yconsole.log(`CODE00000114`, `Loading fields meta from '${table}'...`);

    let markedFields: DJiraFieldMarkedMeta[] = [];
    const dbdJiraIssue = await env.dbProvider(async function(db: OracleConnection0) {
        markedFields = await readDJiraFieldMarkedMeta(db, table, false);
        if (env.settings.write_into_log_tables) {
            let preparedDomain: any = prepareDbDomain(env.settings, dbdJiraIssueInputLog(markedFields));
            env.settings.tables.ISSUE_T = preparedDomain.name;
            return preparedDomain;
        } else {
            return prepareDbDomain(env.settings, dbdJiraIssueInput(markedFields));
        }
    });

    yconsole.log(`CODE00000115`, `Loading fields meta - OK`);
    return Object.assign(env, { dbdJiraIssue }) as EnvWithDbdJiraIssue;
}
