import { SqliteLog } from "../YsqlLog/SqliteLog";
import { IssueLoaderStatus, makeStatus } from "./IssueLoaderStatus";
import moment, { Moment } from "moment";

import better_sqlite3 from "better-sqlite3";
import deepMerge from "deepmerge";
import { readFileSync } from "fs";
import { resolve } from "path";
import { debugMsgFactory, manageableSetTimeout, manageableTimer, ManageableTimer, yconsole, YConsoleMsg } from "Ystd";
import oracledb, { Connection } from "oracledb";
import {
    dbdDChangelogItemInput,
    dbdDCommentItemInput,
    dbdDJiraFieldInput,
    dbdDLabelInput,
    dbdDLinkItemInput,
    dbdDLinkTypeInput,
    dbdDUserInput,
    dbdDWorklogItemInput,
    dbdJiraIssueInput,
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
import { JiraWrapper } from "Yjira";
import { ymutex } from "../Ystd/ymutex";
import { jobListLogColumnStr, JobLogItem, JobStorage } from "Yjob";
import { genericLogColumnStr, GenericLogItem } from "./genericLog";
import { allJobTypes } from "job";
import { jobFieldFuncs } from "../job/JobFieldsServer";

const debug = debugMsgFactory("startup");

export type StartMode = "init" | "deploy" | "run" | "reload" | "drop_all" | "test" | "debugfm";

export interface StartOptions {
    noDbTest?: boolean;
    noJiraTest?: boolean;
    args?: any;
    debugMode?: boolean;
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
    jiraFullLoadBatchSize: number;
    jiraHistDate: string; // Date in iso format
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

export const defaultSettings = (): EnvSettings => ({
    sqlite_stg: "sqlite_stg.db",
    sqlite_history: "sqlite_history.db",
    sqlite_log: "sqlite_log.db",
    instanceName: "<instanceName not set in settings.json>",
    jiraMaxResults: 1000,
    jiraMaxConnections: 5,
    jiraHistDate: "2019-11-19",
    jiraFullLoadBatchSize: 100,
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

export type OracleConnection = Connection | Connection;
export type DbProviderCallback<T> = (db: OracleConnection) => Promise<T>;

export interface Env {
    terminating: boolean;
    versionStr: string;
    args: any;
    startMode: StartMode;
    settings: EnvSettings;
    jira: JiraWrapper;
    dbProvider: <T>(callback: (db: OracleConnection) => Promise<T>) => Promise<T>;

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
    jobStorage: JobStorage<EnvWithDbdJiraIssue>;
    debugMode?: boolean;
    timers: Set<ManageableTimer>;
    terminate: () => void | Promise<void>;
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
        terminating: false,
        timers: new Set(),
        terminate: () => {
            pthis.terminating = true;
            for (let timer of pthis.timers) timer.cancel();
        },
    } as any) as Env;
    const { args, noDbTest, noJiraTest, debugMode } = startOptions;
    delete startOptions.args;

    yconsole.log(
        `CODE00000094`,
        `Starting issue_loader, mode = ${startMode}, startOptions = ${JSON.stringify(startOptions)}...`
    );
    const settingsPath = resolve("./settings.json");
    yconsole.log(`CODE00000095`, `settingsPath = ${settingsPath}`);

    const settings = deepMerge(defaultSettings(), JSON.parse(readFileSync(settingsPath, "utf-8")));
    if (settings.monitorEndpointPort)
        yconsole.log(`CODE00000096`, `Monitoring on port ${settings.monitorEndpointPort}`);

    const status = makeStatus();
    const better_sqlite3_log = better_sqlite3(settings.sqlite_log);
    const jobLog = new SqliteLog<JobLogItem>(better_sqlite3_log, jobListLogColumnStr, { table: "job_log" });
    const genericLog = new SqliteLog<GenericLogItem>(better_sqlite3_log, genericLogColumnStr, { table: "generic_log" });

    const better_sqlite3_db = better_sqlite3(settings.sqlite_stg);
    const better_sqlite3_db_history = better_sqlite3(settings.sqlite_history);

    let v: IssueLoaderVersion = {};
    try {
        v = JSON.parse(readFileSync("version.json", "utf-8"));
    } catch (e) {
        if (e.code !== "ENOENT") throw e;
    }
    const versionStr = `${v.major || 0}.${v.minor || 0}.${v.build || 0}`;
    yconsole.log(`CODE00000097`, `version = ${versionStr}`);

    debug(`CODE00000098`, `Load settings - finished`);

    debug(`CODE00000105`, `Initializing database domains`);

    const dbdDJiraField = prepareDbDomain(settings, dbdDJiraFieldInput);
    const dbdLoadStream = prepareDbDomain(settings, dbdLoadStreamInput);
    const dbdDCommentItem = prepareDbDomain(settings, dbdDCommentItemInput);
    const dbdDChangelogItem = prepareDbDomain(settings, dbdDChangelogItemInput);
    const dbdDUser = prepareDbDomain(settings, dbdDUserInput);
    const dbdDLabel = prepareDbDomain(settings, dbdDLabelInput);
    const dbdDWorklogItem = prepareDbDomain(settings, dbdDWorklogItemInput);
    const dbdDLinkItem = prepareDbDomain(settings, dbdDLinkItemInput);
    const dbdDLinkType = prepareDbDomain(settings, dbdDLinkTypeInput);

    debug(`CODE00000106`, `dbdDJiraField - OK`);

    if (!noJiraTest)
        yconsole.log(
            `CODE00000107`,
            `Testing Jira connection with '${settings.jira.protocol}' to '${settings.jira.host}:${settings.jira.port}'...`
        );

    const jira = new JiraWrapper(settings);

    if (!noJiraTest) {
        const serverInfo = await jira.getServerInfo();
        if (!serverInfo || !serverInfo.version)
            yconsole.error(`CODE00000108`, `Couldn't connect to Jira. Will retry later...`);
        else yconsole.log(`CODE00000109`, `Connected to Jira v${serverInfo.version} - OK`);
    }

    const dbMutex = ymutex();
    const dbProvider = async function<T>(callback: DbProviderCallback<T>) {
        return dbMutex.lock(async function() {
            oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
            const db = await oracledb.getConnection(settings.oracle);
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
        const oracleVersion = await dbProvider(async function(db: Connection) {
            const r = await db.execute(
                `SELECT * from v$version`,
                [] // bind value for :id
            );
            // @ts-ignore
            return Object.values(r.rows[0])[0];
        });
        if (!oracleVersion || !oracleVersion.length)
            yconsole.error(`CODE00000111`, `Couldn't connect to Oracle. Will retry later...`);
        else yconsole.log(`CODE00000112`, `Connected to Oracle '${oracleVersion}' - OK`);
    }

    const jobStorage = new JobStorage({
        env: pthis,
        db: better_sqlite3_db,
        historyDb: better_sqlite3_db_history,
        allJobTypes,
        autoStartExistingJobs: !debugMode,
        console: yconsole,
        setTimeout: manageableSetTimeout,
        jobFieldFuncs,
    }) as JobStorage<EnvWithDbdJiraIssue>;

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
            manageableTimer(pthis, 4 * 60 * 60 * 1000, "CODE00000274", "deleteOldLogs", deleteOldLogs);
        }
    };
    if (startMode === "run") deleteOldLogs();

    (global as any).logger = (m: YConsoleMsg) => {
        genericLog.add(Object.assign({}, m, { data: m.data && m.data.length ? JSON.stringify(m.data) : "" }));
        return true;
    };

    debug(`CODE00000113`, `startEnv - finished`);
    return Object.assign(pthis, {
        terminating: false,
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
        debugMode,
    } as Env);
};

export async function loadDbdIssueFields(env: Env, current: boolean = true): Promise<EnvWithDbdJiraIssue> {
    const table = current ? env.settings.tables.CURRENT_JIRA_FIELD_T : env.settings.tables.JIRA_FIELD_T;
    yconsole.log(`CODE00000114`, `Loading fields meta from '${table}'...`);

    let markedFields: DJiraFieldMarkedMeta[] = [];
    const dbdJiraIssue = await env.dbProvider(async function(db: OracleConnection) {
        markedFields = await readDJiraFieldMarkedMeta(db, table, false);
        return prepareDbDomain(env.settings, dbdJiraIssueInput(markedFields));
    });

    yconsole.log(`CODE00000115`, `Loading fields meta - OK`);
    return Object.assign(env, { dbdJiraIssue }) as EnvWithDbdJiraIssue;
}
