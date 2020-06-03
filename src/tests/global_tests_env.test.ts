import better_sqlite3 from "better-sqlite3";
import { JobState, JobStorage } from "Yjob";
import {
    DbProviderCallback,
    defaultSettings,
    EnvWithDbdJiraIssue,
    genericLogColumnStr,
    GenericLogItem,
    IssueLoaderVersion,
    makeStatus,
} from "other";
import { debugMsgFactory, manageableSetTimeout, ManageableTimer, yconsole, YConsoleMsg } from "Ystd";
import deepMerge from "deepmerge";
import { SqliteLog } from "YsqlLog";
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
    prepareDbDomain,
} from "dbDomains";
import { JiraStubInterface, JiraWrapper, makeJiraStub } from "Yjira";
import {
    JobContextStatus,
    jobContextFieldFuncs,
    JobStatus,
    SerializedJob,
    SerializedJobContext,
} from "../job/JobFieldsServer";
import { allJobContextTypes, allJobTypes } from "job";
import { ensureDirSync, readFileSync, unlinkSync } from "fs-extra";
import { join as joinPath, resolve } from "path";
import { makeOracleStub } from "Yoracle";
import { startMonitoring } from "monitoring_api";
import { utMarkedFields1 } from "./global_tests_jira_fields.test";

const debug = debugMsgFactory("ut.startup");

export interface TestEnvInput {
    testName: string;
    deleteDbOnStart?: boolean;
}

export const defaultTestEnvInput = {
    deleteDbOnStart: true,
};

export async function makeTestEnv(opts0: TestEnvInput) {
    const opts = { ...defaultTestEnvInput, ...opts0 };
    const { testName } = opts;

    if (!testName) throw new Error(`CODE00000191 No test name given!`);

    const noBatchMode = true;
    const monitorEndpointPort = 7007;
    const testsDbFolder = resolve(`./tests_db`);
    ensureDirSync(testsDbFolder);
    const sqlite_path = resolve(joinPath(testsDbFolder, `ut_${testName}.db`));
    console.log(`CODE00000025 Test db path = ${sqlite_path}`);
    if (opts.deleteDbOnStart)
        try {
            unlinkSync(sqlite_path);
        } catch (e) {}

    const env = {
        onTerminateCallbacks: [] as (() => void)[],
        terminating: false as boolean,
        timers: new Set<ManageableTimer>(),
        terminate: () => {
            env.terminating = true;
            for (let timer of env.timers) timer.cancel();
        },
    };

    const settingsPath = resolve("./settings.json");
    yconsole.log(`CODE00000012`, `settingsPath = ${settingsPath}`);

    const settings = deepMerge(defaultSettings(), JSON.parse(readFileSync(settingsPath, "utf-8")));
    if (settings.monitorEndpointPort)
        yconsole.log(`CODE00000014`, `Monitoring on port ${settings.monitorEndpointPort}`);

    const status = makeStatus();
    const better_sqlite3_db = better_sqlite3(sqlite_path);

    let v: IssueLoaderVersion = {};
    try {
        v = JSON.parse(readFileSync("version.json", "utf-8"));
    } catch (e) {
        if (e.code !== "ENOENT") throw e;
    }
    const versionStr = `${v.major || 0}.${v.minor || 0}.${v.build || 0}`;
    yconsole.log(`CODE00000015`, `version = ${versionStr}`);

    debug(`CODE00000016`, `Load settings - finished`);

    debug(`CODE00000017`, `Initializing database domains`);

    const dbdDJiraField = prepareDbDomain(settings, dbdDJiraFieldInput);
    const dbdLoadStream = prepareDbDomain(settings, dbdLoadStreamInput);
    const dbdDCommentItem = prepareDbDomain(settings, dbdDCommentItemInput);
    const dbdDChangelogItem = prepareDbDomain(settings, dbdDChangelogItemInput);
    const dbdDUser = prepareDbDomain(settings, dbdDUserInput);
    const dbdDLabel = prepareDbDomain(settings, dbdDLabelInput);
    const dbdDWorklogItem = prepareDbDomain(settings, dbdDWorklogItemInput);
    const dbdDLinkItem = prepareDbDomain(settings, dbdDLinkItemInput);
    const dbdDLinkType = prepareDbDomain(settings, dbdDLinkTypeInput);
    const dbdJiraIssue = await prepareDbDomain(settings, dbdJiraIssueInput(utMarkedFields1));

    debug(`CODE00000018`, `dbdDJiraField - OK`);

    yconsole.log(
        `CODE00000019`,
        `Testing Jira connection with '${settings.jira.protocol}' to '${settings.jira.host}:${settings.jira.port}'...`
    );

    let jiraStub: JiraStubInterface | undefined;
    if (settings.jiraStub) {
        if (settings.jiraStub.filename) settings.jiraStub.filename = resolve(settings.jiraStub.filename!);
        jiraStub = makeJiraStub({ ...settings.jiraStub, console: yconsole, env });
    }

    const jira = new JiraWrapper({
        ...settings,
        jiraStub,
        credentials: settings.jira,
        console: yconsole,
    });

    const serverInfo = await jira.getServerInfo();
    if (!serverInfo || !serverInfo.version)
        yconsole.error(`CODE00000188`, `Couldn't connect to Jira. Will retry later...`);
    else yconsole.log(`CODE00000189`, `Connected to Jira v${serverInfo.version} - OK`);

    const oracleDbStub = makeOracleStub({
        betterSqlite: better_sqlite3_db,
    });
    const dbProvider = async function<T>(callback: DbProviderCallback<T>) {
        return await callback(oracleDbStub);
    };

    startMonitoring(env as any, settings.monitorEndpointPort);

    const jobStorage = new JobStorage<
        EnvWithDbdJiraIssue, // TEnv
        SerializedJobContext, // TSerializedJobContext extends DefaultSerializedJobContext = DefaultSerializedJobContext,
        JobContextStatus, // TJobContextStatus extends DefaultJobContextStatus = DefaultJobContextStatus
        SerializedJob, // TSerializedJob extends DefaultSerializedJob = DefaultSerializedJob,
        JobStatus // TJobStatus extends DefaultJobStatus = DefaultJobStatus,
    >({
        env: env as any,
        db: better_sqlite3_db,
        allJobTypes,
        allJobContextTypes,
        noBatchMode: noBatchMode,
        console: yconsole,
        setTimeout: manageableSetTimeout,
        jobContextFieldFuncs,
        errorStateChanged: (error: Error | undefined) => {
            // void | Promise<void>
            // TODO env.globalMessages.sqlite = { status: (!error ? "OK" : "Error"), error };
        },
        jobResourcesLimits: {
            jira: 10,
            cpu: 10,
            db: 1000,
        },
    });

    const genericLogDb = better_sqlite3_db;
    const genericLog = new SqliteLog<GenericLogItem>(genericLogDb, genericLogColumnStr, { table: "generic_log" });

    (global as any).logger = (m: YConsoleMsg) => {
        genericLog.add(Object.assign({}, m, { data: m.data && m.data.length ? JSON.stringify(m.data) : "" }));
        return true;
    };

    const globalMessages = { oracle: "ok", sqllite: "ok", jira: "ok" };

    debug(`CODE00000190`, `startEnv - finished`);
    return Object.assign(env, {
        terminating: false,
        versionStr,
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
        dbdJiraIssue,
        status,
        genericLog,
        jobStorage,
        globalMessages,
        noBatchMode,
        testName,
    });
}

type UnPromisify<T> = T extends Promise<infer U> ? U : T;
export type GenericTestEnv = UnPromisify<ReturnType<typeof makeTestEnv>>;

xdescribe(`global_tests_env`, function() {
    let env: GenericTestEnv = undefined as any;
    it(`init_env CODE00000192`, async function() {
        try {
            env = await makeTestEnv({ testName: "init_env" } as any);
        } finally {
            if (env) env.terminate();
        }
        // OK if no exceptions thrown
    });
});

export function loadTestContext(env: any, JSON_jobsById: any) {
    //собираем тестовый контекст
    let row = {
        id: "testid",
        key: 'issue:{"issueKey":"DATAMAP-102"}',
        jobsById: JSON.stringify(JSON_jobsById),
        priority: null,
        predecessorsDone: 0, ///??????
        jobContext: "issue",
        succeded: 0,
        prevError: null,
        retryIntervalIndex: 0,
        nextRunTs: null,
        input: undefined,
        paused: 0,
        timesSaved: 0, // ????????????????
        updatedTs: "2020-01-01T12:00:00+03:00",
        state: "runnning",
        stage: "02_transform",
        jobContextType: "issue",
    };

    //грузим контекст в ОП
    env.jobStorage.loadJobContext(row);
}
