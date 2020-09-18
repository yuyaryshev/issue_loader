import { Env } from "other";
import moment from "moment";
import { debugMsgFactory as debugjs, manageableTimer } from "Ystd";
import { IssueLoaderStatItem, ProjectStatsApiRequest, ProjectStatsApiResponse } from "./projectStatsApi.types";
import { linearDataInterpolation } from "../Ystd/linearDataInterpolation";

const debug = debugjs("projectStatsApi");
let started = false;

let projectStats: IssueLoaderStatItem[] = [];

// http://a123278.moscow.alfaintra.net:29364/api/stats

let refreshTimer: any = undefined;
let ok: boolean = false;
let error: string | undefined = "Not refreshed";

let showTestData = false;

const testDataCounterMax = 200;
let testDataCounter = 0;

export async function projectStatsApi(env: Env, req: any, res: any) {
    // @ts-ignore
    const pthis = this;

    const ts = moment().format();
    const query: ProjectStatsApiRequest = req.query;

    if (!refreshTimer)
        refreshTimer = manageableTimer(env, 300, `CODE00000125`, "projectStatsRefreshTimer", () => {
            ok = false;
            try {
                if (showTestData) makeTestData();
                else
                    projectStats = env.jobStorage.db
                        .prepare(
                            `select project, stage, state, hasError, loaded, count(1) c 
                        from all_jobContexts                         
                        group by project, stage, state, hasError, loaded`
                        )
                        .all();

                ok = true;
                error = undefined;
            } catch (e) {
                error = e.message;
                if (env.debugMode) debug(`CODE00000097 statsApi for ts=${query.ts} - ERROR!`, e);
            }
        });
    await refreshTimer.notSoonerThan();

    let contextsInQueueM = 0;

    for (let i of projectStats) {
        if (!(i.state == "succeded" || i.state == "running")) {
            contextsInQueueM += i.c;
        }
    }
    let contextsInQueue = "" + contextsInQueueM;

    return res.send(
        JSON.stringify({
            ok,
            error,
            ts,
            contextsInQueue,
            stats: projectStats,
        } as ProjectStatsApiResponse)
    );
}

function makeTestData() {
    if (showTestData) {
        let d = linearDataInterpolation([
            {
                ms: 5000,
                "01_jira.readyToRun": 0,
                "01_jira.running": 0,
                "02_transform.readyToRun": 0,
                "02_transform.running": 0,
                "03_db.readyToRun": 0,
                "03_db.running": 0,
                "99_succeded": 0,
                "01_jira.error": 0,
                "02_transform.error": 0,
                "03_db.error": 0,
            },
            {
                ms: 5000,
                "01_jira.readyToRun": 100,
                "01_jira.running": 0,
                "02_transform.readyToRun": 0,
                "02_transform.running": 0,
                "03_db.readyToRun": 0,
                "03_db.running": 0,
                "99_succeded": 0,
                "01_jira.error": 0,
                "02_transform.error": 0,
                "03_db.error": 0,
            },
            {
                ms: 5000,
                "01_jira.readyToRun": 89,
                "01_jira.running": 10,
                "02_transform.readyToRun": 0,
                "02_transform.running": 0,
                "03_db.readyToRun": 0,
                "03_db.running": 0,
                "99_succeded": 0,
                "01_jira.error": 1,
                "02_transform.error": 0,
                "03_db.error": 0,
            },
            {
                ms: 5000,
                "01_jira.readyToRun": 57,
                "01_jira.running": 10,
                "02_transform.readyToRun": 25,
                "02_transform.running": 5,
                "03_db.readyToRun": 0,
                "03_db.running": 0,
                "99_succeded": 0,
                "01_jira.error": 2,
                "02_transform.error": 1,
                "03_db.error": 0,
            },
            {
                ms: 5000,
                "01_jira.readyToRun": 0,
                "01_jira.running": 0,
                "02_transform.readyToRun": 45,
                "02_transform.running": 10,
                "03_db.readyToRun": 30,
                "03_db.running": 10,
                "99_succeded": 0,
                "01_jira.error": 2,
                "02_transform.error": 2,
                "03_db.error": 1,
            },
            {
                ms: 5000,
                "01_jira.readyToRun": 0,
                "01_jira.running": 0,
                "02_transform.readyToRun": 0,
                "02_transform.running": 0,
                "03_db.readyToRun": 0,
                "03_db.running": 0,
                "99_succeded": 92,
                "01_jira.error": 3,
                "02_transform.error": 3,
                "03_db.error": 2,
            },
            {
                ms: 2000,
                "01_jira.readyToRun": 0,
                "01_jira.running": 0,
                "02_transform.readyToRun": 0,
                "02_transform.running": 0,
                "03_db.readyToRun": 0,
                "03_db.running": 0,
                "99_succeded": 0,
                "01_jira.error": 0,
                "02_transform.error": 0,
                "03_db.error": 0,
            },
        ]);

        for (let k in d) (d as any)[k] = Math.round((d as any)[k]);
        projectStats = [
            {
                project: "TEST_DATA",
                stage: "01_jira",
                state: "readyToRun",
                hasError: false,
                loaded: true,
                c: d["01_jira.readyToRun"],
            },
            {
                project: "TEST_DATA",
                stage: "02_transform",
                state: "readyToRun",
                hasError: false,
                loaded: true,
                c: d["02_transform.readyToRun"],
            },
            {
                project: "TEST_DATA",
                stage: "03_db",
                state: "readyToRun",
                hasError: false,
                loaded: true,
                c: d["03_db.readyToRun"],
            },

            {
                project: "TEST_DATA",
                stage: "01_jira",
                state: "running",
                hasError: false,
                loaded: true,
                c: d["01_jira.running"],
            },
            {
                project: "TEST_DATA",
                stage: "02_transform",
                state: "running",
                hasError: false,
                loaded: true,
                c: d["02_transform.running"],
            },
            {
                project: "TEST_DATA",
                stage: "03_db",
                state: "running",
                hasError: false,
                loaded: true,
                c: d["03_db.running"],
            },
            {
                project: "TEST_DATA",
                stage: "99_succeded",
                state: "succeded",
                hasError: false,
                loaded: true,
                c: d["99_succeded"],
            },
            {
                project: "TEST_DATA",
                stage: "01_jira",
                state: "waitingTime",
                hasError: true,
                loaded: true,
                c: d["01_jira.error"],
            },
            {
                project: "TEST_DATA",
                stage: "02_transform",
                state: "waitingTime",
                hasError: true,
                loaded: true,
                c: d["02_transform.error"],
            },
            {
                project: "TEST_DATA",
                stage: "03_db",
                state: "waitingTime",
                hasError: true,
                loaded: true,
                c: d["03_db.error"],
            },
        ];
    }
}
