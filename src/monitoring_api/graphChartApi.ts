import { Env } from "other";
import moment from "moment";
import { debugMsgFactory as debugjs, manageableTimer } from "Ystd";
import { IssueLoaderStatItem, IssueStatsApiRequest, IssueStatsApiResponse } from "./issueStatsApi.types";
import { linearDataInterpolation } from "../Ystd/linearDataInterpolation";

const debug = debugjs("issueStatsApi");
let started = false;

let issueStats: IssueLoaderStatItem[] = [];

// http://a123278.moscow.alfaintra.net:29364/api/graphChart

let refreshTimer: any = undefined;
let ok: boolean = false;
let error: string | undefined = "Not refreshed";

let showTestData = false;

const testDataCounterMax = 200;
let testDataCounter = 0;

export async function graphChartApi(env: Env, req: any, res: any) {
    // @ts-ignore
    const pthis = this;

    const ts = moment().format();

    const { query } = req;

    let jobsData: any = [];
    let resourcesData: any = [];
    let storageData: any = [];

    if (query.period == "per2hours") {
        jobsData = [
            {
                name: "10:10",
                jiraIssue: 3000,
                jiraComments: 2400,
                jiraWorklog: 2400,
                transformIssue: 1200,
                writeIssueToDb: 1000,
            },
            {
                name: "10:20",
                jiraIssue: 3000,
                jiraComments: 1398,
                jiraWorklog: 2210,
                transformIssue: 1200,
                writeIssueToDb: 1100,
            },
            {
                name: "10:30",
                jiraIssue: 2000,
                jiraComments: 9800,
                jiraWorklog: 2290,
                transformIssue: 1200,
                writeIssueToDb: 1200,
            },
            {
                name: "10:40",
                jiraIssue: 2780,
                jiraComments: 3908,
                jiraWorklog: 2000,
                transformIssue: 1200,
                writeIssueToDb: 12000,
            },
            {
                name: "10:50",
                jiraIssue: 1890,
                jiraComments: 4800,
                jiraWorklog: 2181,
                transformIssue: 1200,
                writeIssueToDb: 0,
            },
            {
                name: "11:00",
                jiraIssue: 2390,
                jiraComments: 3800,
                jiraWorklog: 2500,
                transformIssue: 1200,
                writeIssueToDb: 400,
            },
            {
                name: "11:10",
                jiraIssue: 3490,
                jiraComments: 4300,
                jiraWorklog: 2100,
                transformIssue: 1200,
                writeIssueToDb: 3000,
            },
            {
                name: "11:20",
                jiraIssue: 3490,
                jiraComments: 4300,
                jiraWorklog: 2100,
                transformIssue: 1200,
                writeIssueToDb: 1000,
            },
            {
                name: "11:30",
                jiraIssue: 3790,
                jiraComments: 4300,
                jiraWorklog: 2100,
                transformIssue: 1200,
                writeIssueToDb: 1000,
            },
            {
                name: "11:40",
                jiraIssue: 4290,
                jiraComments: 4300,
                jiraWorklog: 2100,
                transformIssue: 1200,
                writeIssueToDb: 1000,
            },
            {
                name: "11:50",
                jiraIssue: 4440,
                jiraComments: 4300,
                jiraWorklog: 2100,
                transformIssue: 1200,
                writeIssueToDb: 1000,
            },
            {
                name: "12:00",
                jiraIssue: 3000,
                jiraComments: 4300,
                jiraWorklog: 2100,
                transformIssue: 1200,
                writeIssueToDb: 1000,
            },
        ];

        resourcesData = [
            {
                name: "10:10",
                jira: 4000,
                CPU: 2400,
                db: 2400,
                jobsRunning: 30,
            },
            {
                name: "10:20",
                jira: 3000,
                CPU: 1398,
                db: 2210,
                jobsRunning: 30,
            },
            {
                name: "10:30",
                jira: 2000,
                CPU: 9800,
                db: 2290,
                jobsRunning: 30,
            },
            {
                name: "10:40",
                jira: 2780,
                CPU: 3908,
                db: 2000,
                jobsRunning: 30,
            },
            {
                name: "10:50",
                jira: 1890,
                CPU: 4800,
                db: 2181,
                jobsRunning: 30,
            },
            {
                name: "11:00",
                jira: 2390,
                CPU: 3800,
                db: 2500,
                jobsRunning: 30,
            },
            {
                name: "11:10",
                jira: 3490,
                CPU: 4300,
                db: 2100,
                jobsRunning: 30,
            },
            {
                name: "11:20",
                jira: 3490,
                CPU: 4000,
                db: 2100,
                jobsRunning: 30,
            },
            {
                name: "11:30",
                jira: 3490,
                CPU: 4400,
                db: 2100,
                jobsRunning: 30,
            },
            {
                name: "11:40",
                jira: 3490,
                CPU: 4600,
                db: 2100,
                jobsRunning: 30,
            },
            {
                name: "11:50",
                jira: 3490,
                CPU: 4800,
                db: 2100,
                jobsRunning: 30,
            },
            {
                name: "12:00",
                jira: 3490,
                CPU: 4100,
                db: 2100,
                jobsRunning: 30,
            },
        ];

        storageData = [
            {
                name: "10:10",
                contextsInMemory: 4000,
                contextsReadyToRun: 2400,
            },
            {
                name: "10:20",
                contextsInMemory: 3000,
                contextsReadyToRun: 1398,
            },
            {
                name: "10:30",
                contextsInMemory: 2000,
                contextsReadyToRun: 9800,
            },
            {
                name: "10:40",
                contextsInMemory: 2780,
                contextsReadyToRun: 3908,
            },
            {
                name: "10:50",
                contextsInMemory: 1890,
                contextsReadyToRun: 4800,
            },
            {
                name: "11:00",
                contextsInMemory: 2390,
                contextsReadyToRun: 3800,
            },
            {
                name: "11:10",
                contextsInMemory: 3490,
                contextsReadyToRun: 0,
            },
            {
                name: "11:20",
                contextsInMemory: 0,
                contextsReadyToRun: 4000,
            },
            {
                name: "11:30",
                contextsInMemory: 3490,
                contextsReadyToRun: 0,
            },
            {
                name: "11:40",
                contextsInMemory: 0,
                contextsReadyToRun: 4600,
            },
            {
                name: "11:50",
                contextsInMemory: 3490,
                contextsReadyToRun: 0,
            },
            {
                name: "12:00",
                contextsInMemory: 0,
                contextsReadyToRun: 4100,
            },
        ];
    } else {
        // per24hours
        jobsData = [
            {
                name: "10:10",
                jiraIssue: 3000,
                jiraComments: 2400,
                jiraWorklog: 2400,
                transformIssue: 1200,
                writeIssueToDb: 1000,
            },
            {
                name: "10:20",
                jiraIssue: 3000,
                jiraComments: 1398,
                jiraWorklog: 2210,
                transformIssue: 1200,
                writeIssueToDb: 1100,
            },
            {
                name: "10:30",
                jiraIssue: 2000,
                jiraComments: 9800,
                jiraWorklog: 2290,
                transformIssue: 1200,
                writeIssueToDb: 1200,
            },
            {
                name: "10:40",
                jiraIssue: 2780,
                jiraComments: 3908,
                jiraWorklog: 2000,
                transformIssue: 1200,
                writeIssueToDb: 12000,
            },
            {
                name: "10:50",
                jiraIssue: 1890,
                jiraComments: 4800,
                jiraWorklog: 2181,
                transformIssue: 1200,
                writeIssueToDb: 0,
            },
            {
                name: "11:00",
                jiraIssue: 2390,
                jiraComments: 3800,
                jiraWorklog: 2500,
                transformIssue: 1200,
                writeIssueToDb: 400,
            },
            {
                name: "11:10",
                jiraIssue: 3490,
                jiraComments: 4300,
                jiraWorklog: 2100,
                transformIssue: 1200,
                writeIssueToDb: 3000,
            },
            {
                name: "11:20",
                jiraIssue: 3490,
                jiraComments: 4300,
                jiraWorklog: 2100,
                transformIssue: 1200,
                writeIssueToDb: 1000,
            },
            {
                name: "11:30",
                jiraIssue: 3790,
                jiraComments: 4300,
                jiraWorklog: 2100,
                transformIssue: 1200,
                writeIssueToDb: 1000,
            },
            {
                name: "11:40",
                jiraIssue: 4290,
                jiraComments: 4300,
                jiraWorklog: 2100,
                transformIssue: 1200,
                writeIssueToDb: 1000,
            },
            {
                name: "11:50",
                jiraIssue: 4440,
                jiraComments: 4300,
                jiraWorklog: 2100,
                transformIssue: 1200,
                writeIssueToDb: 1000,
            },
            {
                name: "12:00",
                jiraIssue: 3000,
                jiraComments: 4300,
                jiraWorklog: 2100,
                transformIssue: 1200,
                writeIssueToDb: 1000,
            },
        ];

        resourcesData = [
            {
                name: "10:10",
                jira: 4000,
                CPU: 2400,
                db: 2400,
                jobsRunning: 30,
            },
            {
                name: "10:20",
                jira: 3000,
                CPU: 1398,
                db: 2210,
                jobsRunning: 30,
            },
            {
                name: "10:30",
                jira: 2000,
                CPU: 9800,
                db: 2290,
                jobsRunning: 30,
            },
            {
                name: "10:40",
                jira: 2780,
                CPU: 3908,
                db: 2000,
                jobsRunning: 30,
            },
            {
                name: "10:50",
                jira: 1890,
                CPU: 4800,
                db: 2181,
                jobsRunning: 30,
            },
            {
                name: "11:00",
                jira: 2390,
                CPU: 3800,
                db: 2500,
                jobsRunning: 30,
            },
            {
                name: "11:10",
                jira: 3490,
                CPU: 4300,
                db: 2100,
                jobsRunning: 30,
            },
            {
                name: "11:20",
                jira: 3490,
                CPU: 4000,
                db: 2100,
                jobsRunning: 30,
            },
            {
                name: "11:30",
                jira: 3490,
                CPU: 4400,
                db: 2100,
                jobsRunning: 30,
            },
            {
                name: "11:40",
                jira: 3490,
                CPU: 4600,
                db: 2100,
                jobsRunning: 30,
            },
            {
                name: "11:50",
                jira: 3490,
                CPU: 4800,
                db: 2100,
                jobsRunning: 30,
            },
            {
                name: "12:00",
                jira: 3490,
                CPU: 4100,
                db: 2100,
                jobsRunning: 30,
            },
        ];

        storageData = [
            {
                name: "10:10",
                contextsInMemory: 4000,
                contextsReadyToRun: 2400,
            },
            {
                name: "10:20",
                contextsInMemory: 3000,
                contextsReadyToRun: 1398,
            },
            {
                name: "10:30",
                contextsInMemory: 2000,
                contextsReadyToRun: 9800,
            },
            {
                name: "10:40",
                contextsInMemory: 2780,
                contextsReadyToRun: 3908,
            },
            {
                name: "10:50",
                contextsInMemory: 1890,
                contextsReadyToRun: 4800,
            },
            {
                name: "11:00",
                contextsInMemory: 2390,
                contextsReadyToRun: 3800,
            },
            {
                name: "11:10",
                contextsInMemory: 3490,
                contextsReadyToRun: 0,
            },
            {
                name: "11:20",
                contextsInMemory: 0,
                contextsReadyToRun: 4000,
            },
            {
                name: "11:30",
                contextsInMemory: 3490,
                contextsReadyToRun: 0,
            },
            {
                name: "11:40",
                contextsInMemory: 0,
                contextsReadyToRun: 4600,
            },
            {
                name: "11:50",
                contextsInMemory: 3490,
                contextsReadyToRun: 0,
            },
            {
                name: "12:00",
                contextsInMemory: 0,
                contextsReadyToRun: 4100,
            },
        ];
    }

    return res.send(
        JSON.stringify({
            ok,
            error,
            graph: {
                jobsData,
                resourcesData,
                storageData,
            },
        })
    );
}
