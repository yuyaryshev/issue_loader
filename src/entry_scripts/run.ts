import { LoadStreamsList } from "./run_refreshLoadStreams";
import { loadDbdIssueFields, startEnv } from "../other/Env";
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

export const run = async function (args: any) {
    if (!args) args = {};
    const cleanStartMode = !!args.cleanStart;
    if (cleanStartMode) {
        const logSqlite = fsPath.resolve("./sqlite_log.db");
        const stgSqlite = fsPath.resolve("./sqlite_stg.db");
        console.log(`CODE00000321`, `Deleting '${stgSqlite}', '${logSqlite}' ...`);
        try {
            fs.unlinkSync(logSqlite);
        } catch (e) {}

        try {
            fs.unlinkSync(stgSqlite);
        } catch (e) {}
    }

    const debugMode = !!args.debugMode;
    const disableRefresh = !!args.disableRefresh || debugMode;
    const dbgReloadProjects = (args.dbgReloadProjects && args.dbgReloadProjects.split(",")) || [];
    if (args.dbgReloadProjects && !dbgReloadProjects.length) {
        console.trace(`CODE00000223 Invalid values in 'dbgReloadProjects' option`);
        process.exit(1);
    }

    const env0 = await startEnv("run", { args, debugMode });

    console.log(`CODE00000251`, `Starting 'run'...`);
    yconsole.log(`CODE00000094`, `Starting 'run'...`);

    const env = await loadDbdIssueFields(env0);

    startMonitoring(env, env.settings.monitorEndpointPort);
    const loadStreamsList = new LoadStreamsList(env.settings);

    async function scanIssueChangesCycle() {
        debugWorkCycle(`CODE00000150`, `Starting`);
        env.jobStorage.my_console.log(`CODE00000319`, `Starting scanIssueChangesCycle`);
        try {
            let thisDay = moment().format("YYYY-MM-DD");
            if (prevDay !== thisDay) {
                debugWorkCycle(`CODE00000151`, `Flushing day counters`);
                prevDay = thisDay;
                for (let k in runStatus.streams) {
                    runStatus.streams[k].countToday = 0;
                }
            }

            let this10mins = moment().format("YYYY-MM-DD HH:mm").substr(0, 15) + "0";
            if (prev10mins !== this10mins) {
                debugWorkCycle(`CODE00000152`, `Flushing 10 min counters`);
                prev10mins = this10mins;
                for (let k in runStatus.streams) runStatus.streams[k].count10min = 0;
            }

            await loadStreamsList.refresh(env);
            await scanForChangedIssueKeys(env, loadStreamsList.loadStreams, { dbgReloadProjects: dbgReloadProjects });
            env.jobStorage.my_console.log(`CODE00000153`, `Finished scanIssueChangesCycle - OK`);
        } catch (e) {
            env.jobStorage.my_console.log(`CODE00000346`, `ERROR_STARTING_SCAN_ISSUE_CHANGES: ${e}`);
        }

        setTimeout(scanIssueChangesCycle, env.settings.timeouts.workCycle);
        debugWorkCycle(`CODE00000154`, `Scheduled next run in ${env.settings.timeouts.workCycle} ms`);
    }

    if (debugMode) {
        yconsole.log(`CODE00000347`, `\n\n\n`);
        yconsole.log(`CODE00000348`, `debugMode = ${debugMode}...\n\n\n`);

        function pauseHandler(job: Job) {
            job.pause();
        }

        env.jobStorage.onJobLoadedHandlers.push(pauseHandler);
        env.jobStorage.onJobCreatedHandlers.push(pauseHandler);
        env.jobStorage.startRegularFunc();
    }

    if (!disableRefresh) {
        manageableTimer(
            env,
            env.settings.timeouts.workCycle,
            `CODE00000119`,
            "scanIssueChangesCycle",
            scanIssueChangesCycle
        ).setTimeout();

        console.log(`CODE00000349`, `Waiting 3 secs for monitoring to start...`);
        yconsole.log(`CODE00000350`, `Waiting 3 secs for monitoring to start...`);
        setTimeout(function startLoading() {
            debug(`CODE00000351`, `starting jobStorage.startRegularFunc`);
            env.jobStorage.startRegularFunc();

            console.log(`CODE00000352`, `Start up finished successfully. Listening to changes in Jira...`);
            yconsole.log(`CODE00000353`, `Start up finished successfully. Listening to changes in Jira...`);
        }, 3000);
    } else if (dbgReloadProjects.length) {
        yconsole.log(`CODE00000314`, `Starting dbgReloadProjects for ${dbgReloadProjects.join(", ")}`);
        await scanForChangedIssueKeys(env, loadStreamsList.loadStreams, { dbgReloadProjects: dbgReloadProjects });
        await awaitDelay(15 * 1000);
        env.terminate(false);
        yconsole.log(`CODE00000322`, `dbgReloadProjects - FINISHED OK.`);
        yconsole.log(`CODE00000323`, `TERMINATIG PROCESS`);
    }
};
