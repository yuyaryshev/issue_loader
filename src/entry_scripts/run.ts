import { LoadStreamsList } from "./run_refreshLoadStreams";
import { loadDbdIssueFields, startEnv } from "../other/Env";
import { IssueStreamRunStatus } from "dbDomains";
import { debugMsgFactory, yconsole } from "Ystd";
import moment from "moment";
import { scanForChangedIssueIds } from "./run_scanForChangedIssueIds";
import { Job } from "Yjob";
import { startMonitoring } from "monitoring_api";

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

export const run = async function(args: any) {
    if (!args) args = {};
    const debugMode = !!args.debugMode;
    const enableScanIssues = !!args.scanIssues;
    const env0 = await startEnv("run", { args, debugMode });

    const port = env0.settings.monitorEndpointPort;
    console.log(`CODE00000141`, `Starting 'run'...`);
    yconsole.log(`CODE00000212`, `Starting 'run'...`);

    if (port) startMonitoring(env0, port);
    else {
        console.log(
            `CODE00000183`,
            `No monitoring port specified. /runStatus and /api/runStatus monitor endpoint is disabled in settings file.`
        );
        yconsole.log(
            `CODE00000225`,
            `No monitoring port specified. /runStatus and /api/runStatus monitor endpoint is disabled in settings file.`
        );
    }

    const env = await loadDbdIssueFields(env0);
    const loadStreamsList = new LoadStreamsList(env.settings);

    async function scanIssueChangesCycle() {
        debugWorkCycle(`CODE00000150`, `Starting`);
        let thisDay = moment().format("YYYY-MM-DD");
        if (prevDay !== thisDay) {
            debugWorkCycle(`CODE00000151`, `Flushing day counters`);
            prevDay = thisDay;
            for (let k in runStatus.streams) {
                runStatus.streams[k].countToday = 0;
            }
        }

        let this10mins =
            moment()
                .format("YYYY-MM-DD HH:mm")
                .substr(0, 15) + "0";
        if (prev10mins !== this10mins) {
            debugWorkCycle(`CODE00000152`, `Flushing 10 min counters`);
            prev10mins = this10mins;
            for (let k in runStatus.streams) runStatus.streams[k].count10min = 0;
        }

        await loadStreamsList.refresh(env);
        await scanForChangedIssueIds(env, loadStreamsList.loadStreams, debugMode && enableScanIssues);
        debugWorkCycle(`CODE00000153`, `Finished - OK`);
        setTimeout(scanIssueChangesCycle, env.settings.timeouts.workCycle);
        debugWorkCycle(`CODE00000154`, `Scheduled next run in ${env.settings.timeouts.workCycle} ms`);
    }

    if (!debugMode || enableScanIssues) scanIssueChangesCycle();

    yconsole.log(`CODE00000155`, `'run' initialization Finished - OK`);

    if (!debugMode) {
        console.log(`CODE00000026`, `Start up finished successfully. Listening to changes in Jira...`);
        yconsole.log(`CODE00000280`, `Start up finished successfully. Listening to changes in Jira...`);
    } else {
        yconsole.log(`CODE00000179`, `\n\n\n`);
        yconsole.log(`CODE00000180`, `debugMode = ${debugMode}...\n\n\n`);

        function pauseHandler(job: Job) {
            if (!job.jobType.stored) return;
            job.pause();
        }

        env.jobStorage.onJobLoadedHandlers.push(pauseHandler);
        env.jobStorage.onJobCreatedHandlers.push(pauseHandler);
        env.jobStorage.startRegularFunc();
    }
};
