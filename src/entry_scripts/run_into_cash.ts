import { LoadStreamsList } from "./run_refreshLoadStreams";
import { EnvWithDbdJiraIssue, loadDbdIssueFields, startEnv } from "../other/Env";
import { IssueStreamRunStatus } from "dbDomains";
import { awaitDelay, debugMsgFactory, manageableTimer, yconsole } from "Ystd";
import moment from "moment";
import { scanForChangedIssueKeys } from "./run_scanForChangedIssueKeys";
import { Job } from "Yjob";
import { startMonitoring } from "monitoring_api";
import fsPath from "path";
import fs from "fs-extra";

const debug = debugMsgFactory("run");
const debugSql = debugMsgFactory("sql");
const debugStreams = debugMsgFactory("run.streams");
const debugIssues = debugMsgFactory("run.issues");
const debugWorkCycle = debugMsgFactory("run.workCycle");

export interface IssueStreamRunStatuses {
    [key: string]: IssueStreamRunStatus;
}

export interface RunStatus {
    lastRun: string;
    streams: IssueStreamRunStatuses;
    jiraTime: string;
    knownErrors: string[];
    instanceName: string;
    versionStr: string;
}

let prevDay = moment().format("YYYY-MM-DD");
let prev10mins = moment().format("YYYY-MM-DD HH:mm");

let runStatus: RunStatus = {
    lastRun: "",
    jiraTime: "",
    streams: {},
    knownErrors: [],
    instanceName: "???",
    versionStr: "?.?.?",
};

export interface PrefetchItem {
    name: string;
    f: () => Promise<void>;
    finished: boolean;
    promise?: Promise<void>;
}

export const run_into_cash = async function (args: any) {
    if (!args) args = {};
    const cleanStartMode = !!args.cleanStart;
    if (cleanStartMode) {
        const logSqlite = fsPath.resolve("./sqlite_log.db");
        const stgSqlite = fsPath.resolve("./sqlite_stg.db");
        console.log(`CODE00000354`, `Deleting '${stgSqlite}', '${logSqlite}' ...`);
        try {
            fs.unlinkSync(logSqlite);
        } catch (e) {}

        try {
            fs.unlinkSync(stgSqlite);
        } catch (e) {}
    }

    const debugMode = !!args.debugMode;
    const dbgReloadProjects = (args.dbgReloadProjects && args.dbgReloadProjects.split(",")) || [];
    if (args.dbgReloadProjects && !dbgReloadProjects.length) {
        console.trace(`CODE00000355 Invalid values in 'dbgReloadProjects' option`);
        process.exit(1);
    }
    let noDbTest = true;
    const env = await startEnv("run_into_cash", { args, debugMode, noDbTest });

    console.log(`CODE00000356`, `Starting 'run'...`);
    yconsole.log(`CODE00000357`, `Starting 'run'...`);

    //const env = await loadDbdIssueFields(env0);

    startMonitoring(Object.assign(env, { dbdJiraIssue: undefined }) as any, env.settings.monitorEndpointPort);
    //const loadStreamsList = new LoadStreamsList(env.settings);

    if (debugMode) {
        yconsole.log(`CODE00000358`, `\n\n\n`);
        yconsole.log(`CODE00000359`, `debugMode = ${debugMode}...\n\n\n`);

        function pauseHandler(job: Job) {
            job.pause();
        }

        env.jobStorage.onJobLoadedHandlers.push(pauseHandler);
        env.jobStorage.onJobCreatedHandlers.push(pauseHandler);
        env.jobStorage.startRegularFunc();
    }

    console.log(`CODE00000360`, `Waiting 3 secs for monitoring to start...`);
    yconsole.log(`CODE00000361`, `Waiting 3 secs for monitoring to start...`);
    setTimeout(function startLoading() {
        debug(`CODE00000362`, `starting jobStorage.startRegularFunc`);
        env.jobStorage.startRegularFunc();

        console.log(`CODE00000363`, `Start up finished successfully. Listening to changes in Jira...`);
        yconsole.log(`CODE00000364`, `Start up finished successfully. Listening to changes in Jira...`);
    }, 3000);
};
