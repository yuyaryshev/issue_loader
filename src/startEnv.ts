import { KVCache } from "./kvCache";
import { dbdDJiraFieldInput } from "./dbdJiraField";
import deepMerge from "deepmerge";
import { readFileSync } from "fs";
import { resolve } from "path";
import { yconsole, debugMsgFactory } from "./consoleMsg";
import JiraClient from "jira-connector";
import { Connection } from "oracledb";
import oracledb from "oracledb";
import { prepareDbDomain } from "./dbDomain";
import { loadCachedRequests } from "./mockableRequest";
import { dbdLoadStreamInput } from "./dbdLoadStream";
import { KVCacheInit } from "./KVCache";
import { JiraWrapper } from "./JiraWrapper";
import { ymutex } from "./ymutex";
import { dbdJiraIssueInput } from "./dbdJiraIssue";
import { readDJiraFieldMarkedMeta, DJiraFieldMarkedMeta } from "./dbdJiraField";
import { PreperedDbDomain } from "./dbDomain";

const debug = debugMsgFactory("startup");

export type StartMode = "init" | "deploy" | "run" | "reload" | "drop_all" | "test" | "debugfm";
export interface StartOptions {
    noDbTest?: boolean;
    noJiraTest?: boolean;
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
    jiraMaxResults: number;
    dbgStream?:string;
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
    issuesCache: CacheSettings;
    requestsCache: CacheSettings;
    monitorEndpointPort: number;
}

export interface TablesSettings {
    JIRA_FIELD_CHANGES: string;
    JIRA_FIELD: string;
    JIRA_ISSUE_RAW_CHANGES: string;
    JIRA_ISSUE_RAW: string;
    JIRA_ISSUE_CHANGES: string;
    JIRA_ISSUE: string;
    JIRA_ISSUE_OLD: string;
    JIRA_WORKLOG_CHANGES: string;
    JIRA_WORKLOG: string;
    LOAD_STREAM: string;
    CURRENT_JIRA_FIELD: string;
}

export interface StoredProcedureSettings {
    HANDLE_JIRA_FIELD_CHANGES: string;
    HANDLE_JIRA_ISSUE_CHANGES: string;
    HANDLE_JIRA_ISSUE_RAW_CHANGES: string;
}

export const defaultSettings = (): EnvSettings => ({
    jiraMaxResults: 1000,
    tables: {
        JIRA_FIELD_CHANGES: "JIRA_FIELD_CHANGES",
        JIRA_FIELD: "JIRA_FIELD",
        JIRA_ISSUE_RAW_CHANGES: "JIRA_ISSUE_RAW_CHANGES",
        JIRA_ISSUE_RAW: "JIRA_ISSUE_RAW",
        JIRA_ISSUE_CHANGES: "JIRA_ISSUE_CHANGES",
        JIRA_ISSUE: "JIRA_ISSUE",
        JIRA_ISSUE_OLD: "JIRA_ISSUES_OLD",
        JIRA_WORKLOG_CHANGES: "JIRA_WORKLOG_CHANGES",
        JIRA_WORKLOG: "JIRA_WORKLOG",
        LOAD_STREAM: "LOAD_STREAM",
        CURRENT_JIRA_FIELD: "DONT_TOUCH_JIRA_FIELD"
    },
    stored_procedures: {
        HANDLE_JIRA_FIELD_CHANGES: "HANDLE_JIRA_FIELD_CHANGES",
        HANDLE_JIRA_ISSUE_CHANGES: "HANDLE_JIRA_ISSUE_CHANGES",
        HANDLE_JIRA_ISSUE_RAW_CHANGES: "HANDLE_JIRA_ISSUE_RAW_CHANGES"
    },
    jira: {
        protocol: "http",
        port: 80,
        host: "jira.moscow.alfaintra.net",
        basic_auth: {
            username: "username",
            password: "password"
        },
        strictSSL: false
    },
    oracle: {
        user: "username",
        password: "password",
        connectString: "DWSTPROD_TAF"
    },
    timeouts: {
        workCycle: 10000,
        dbRetry: 10000,
        jiraIncrFallbackOffset: [10, "minutes"]
    },
    debug: {
        issueKey: "",
        clearCaches: false
    },
    issuesCache: {
        enabled: true,
        file: "issuesCache.db",
        minutesToLive: undefined, // 366 * 24 * 60 // 366 days
    },
    requestsCache: {
        enabled: false,
        file: "requestsCache.db",
        minutesToLive: 10*60,
    },
    monitorEndpointPort: 29354
});

export type OracleConnection = Connection | Connection;
export type DbProviderCallback<T> = (db: OracleConnection) => Promise<T>;

export interface Env {
    startMode: StartMode;
    settings: EnvSettings;
    jira: JiraWrapper;
    dbProvider: <T>(callback: (db: OracleConnection) => Promise<T>) => Promise<T>;
    dbdDJiraField: ReturnType<typeof prepareDbDomain>;
    dbdLoadStream: ReturnType<typeof prepareDbDomain>;
    issuesCache: KVCache;
    requestsCache: KVCache;
}

export interface EnvWithDbdJiraIssue extends Env {
    dbdJiraIssue: PreperedDbDomain;
}

export const startEnv = async (startMode: StartMode, startOptions: StartOptions = {}): Promise<Env> => {
    const { noDbTest, noJiraTest } = startOptions;

    yconsole.log(
        `T0001`,
        `Starting issue_loader, mode = ${startMode}, startOptions = ${JSON.stringify(startOptions)}...`
    );
    const settingsPath = resolve("./settings.json");
    yconsole.log(`T0002`, `settingsPath = ${settingsPath}`);

    const settings = deepMerge(defaultSettings(), JSON.parse(readFileSync(settingsPath, "utf-8")));
    debug(`T0003`, `Load settings - finished`);

    if (settings.issuesCache.enabled) debug(`T0301`, `Opening/creating issuesCache '${settings.issuesCache.file}'...`);
    const issuesCache = await KVCacheInit(settings.issuesCache);
    if (settings.issuesCache.enabled) debug(`T0302`, `Opening issuesCache '${settings.issuesCache.file}' - OK`);

    if (settings.requestsCache.enabled)
        debug(`T0311`, `Opening/creating requestsCache '${settings.requestsCache.file}'...`);
    const requestsCache = await KVCacheInit(settings.requestsCache);
    if (settings.requestsCache.enabled) debug(`T0312`, `Opening requestsCache '${settings.requestsCache.file}' - OK`);

    debug(`T0004`, `Initializing database domains`);

    const dbdDJiraField = prepareDbDomain(settings, dbdDJiraFieldInput);
    const dbdLoadStream = prepareDbDomain(settings, dbdLoadStreamInput);

    debug(`T0005`, `dbdDJiraField - OK`);

    if (!noJiraTest)
        yconsole.log(
            `T0014`,
            `Testing Jira connection with '${settings.jira.protocol}' to '${settings.jira.host}:${settings.jira.port}'...`
        );

    const jira = new JiraWrapper(settings, requestsCache);

    if (!noJiraTest) {
        const serverInfo = await jira.getServerInfo();
        if (!serverInfo || !serverInfo.version)
            yconsole.error(`T0015`, `Couldn't connect to Jira. Will retry later...`);
        else yconsole.log(`T0016`, `Connected to Jira v${serverInfo.version} - OK`);
    }

    const dbMutex = ymutex();
    const dbProvider = async function<T>(callback: DbProviderCallback<T>) {
        return dbMutex.lock((async function(){
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
            }));
    };

    if (!noDbTest) {
        yconsole.log(`T0017`, `Testing Oracle connection '${settings.oracle.connectString}'...`);
        const oracleVersion = await dbProvider(async function(db: Connection) {
            const r = await db.execute(
                `SELECT * from v$version`,
                [] // bind value for :id
            );
            // @ts-ignore
            return Object.values(r.rows[0])[0];
        });
        if (!oracleVersion || !oracleVersion.length)
            yconsole.error(`T0018`, `Couldn't connect to Oracle. Will retry later...`);
        else yconsole.log(`T0019`, `Connected to Oracle '${oracleVersion}' - OK`);
    }

    debug(`T0020`, `startEnv - finished`);
    return { startMode, settings, jira, dbProvider, dbdDJiraField, dbdLoadStream, issuesCache, requestsCache };
};

export async function loadDbdIssueFields(env: Env, current: boolean = true): Promise<EnvWithDbdJiraIssue> {
    const table = (current ? env.settings.tables.CURRENT_JIRA_FIELD : env.settings.tables.JIRA_FIELD);
    yconsole.log(`T8602`, `Loading fields meta from '${table}'...`);

    let markedFields: DJiraFieldMarkedMeta[] = [];
    const dbdJiraIssue = await env.dbProvider(async function(db: OracleConnection) {
        markedFields = await readDJiraFieldMarkedMeta(db, table, false);
        return prepareDbDomain(env.settings, dbdJiraIssueInput(markedFields));
    });

    yconsole.log(`T8605`, `Loading fields meta - OK`);
    return Object.assign(env, {dbdJiraIssue}) as EnvWithDbdJiraIssue;
}