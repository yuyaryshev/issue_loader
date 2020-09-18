import { Env } from "other";
import moment from "moment";
import { debugMsgFactory as debugjs, manageableTimer } from "Ystd";
import { IssueLoaderStatItem, ProjectStatsApiRequest, ProjectStatsApiResponse } from "./projectStatsApi.types";
import { linearDataInterpolation } from "../Ystd/linearDataInterpolation";

const debug = debugjs("projectStatsApi");
let started = false;

let projectStats: IssueLoaderStatItem[] = [];

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
    let querySQL = "select 1";
    //let currDateMoment = moment()
    let currDate = moment().format("YYYY-MM-DD HH:mm");

    if (query.period == "per2hours") {
        querySQL = `select 
  substr(t1.ts1, 11,6) time, 
  IFNULL(t2.items_per_day, 0) JI_items_per_day, 
  IFNULL(t3.items_per_day, 0) JC_items_per_day, 
  IFNULL(t4.items_per_day, 0) JW_items_per_day,
  IFNULL(t5.items_per_day, 0) TI_items_per_day, 
  IFNULL(t6.items_per_day, 0) WI_items_per_day from
(select substr(strftime('%Y-%m-%d %H:%M','${currDate}', '-120 minutes'),1,15)||'0' ts1
union all select substr(strftime('%Y-%m-%d %H:%M','${currDate}', '-110 minutes'),1,15)||'0' ts1
union all select substr(strftime('%Y-%m-%d %H:%M','${currDate}', '-100 minutes'),1,15)||'0' ts1
union all select substr(strftime('%Y-%m-%d %H:%M','${currDate}', '-90 minutes'),1,15)||'0' ts1
union all select substr(strftime('%Y-%m-%d %H:%M','${currDate}', '-80 minutes'),1,15)||'0' ts1
union all select substr(strftime('%Y-%m-%d %H:%M','${currDate}', '-70 minutes'),1,15)||'0' ts1
union all select substr(strftime('%Y-%m-%d %H:%M','${currDate}', '-60 minutes'),1,15)||'0' ts1
union all select substr(strftime('%Y-%m-%d %H:%M','${currDate}', '-50 minutes'),1,15)||'0' ts1
union all select substr(strftime('%Y-%m-%d %H:%M','${currDate}', '-40 minutes'),1,15)||'0' ts1
union all select substr(strftime('%Y-%m-%d %H:%M','${currDate}', '-30 minutes'),1,15)||'0' ts1
union all select substr(strftime('%Y-%m-%d %H:%M','${currDate}', '-20 minutes'),1,15)||'0' ts1
union all select substr(strftime('%Y-%m-%d %H:%M','${currDate}', '-10 minutes'),1,15)||'0' ts1
union all select substr(strftime('%Y-%m-%d %H:%M','${currDate}'),1,15)||'0' ts1) t1
left join 
(select
      ts2
    , count(1)*6*24 items_per_day --2020-06-03 10:00
from
    (
    select substr(datetime(ts,'+3 hours'),1,15)||'0' ts2  --15,12
    from job_log
    where finished = 1 and type = 'jiraIssue' and step = 'Successful' and datetime(ts,'+6 hours')>datetime('${currDate}')
    ) a
group by ts2) t2 on t1.ts1 = t2.ts2
left join 
(select
      ts3
    , count(1)*6*24 items_per_day --2020-06-03 10:00
from
    (
    select substr(datetime(ts,'+3 hours'),1,15)||'0' ts3  --15,12
    from job_log
    where finished = 1 and type = 'jiraComments' and step = 'Successful' and datetime(ts,'+6 hours')>datetime('${currDate}')
    ) a
group by ts3) t3 on t1.ts1 = t3.ts3
left join 
(select
      ts4
    , count(1)*6*24 items_per_day --2020-06-03 10:00
from
    (
    select substr(datetime(ts,'+3 hours'),1,15)||'0' ts4  --15,12
    from job_log
    where finished = 1 and type = 'jiraWorklog' and step = 'Successful' and datetime(ts,'+6 hours')>datetime('${currDate}')
    ) a
group by ts4) t4 on t1.ts1 = t4.ts4
left join 
(select
      ts5
    , count(1)*6*24 items_per_day --2020-06-03 10:00
from
    (
    select substr(datetime(ts,'+3 hours'),1,15)||'0' ts5  --15,12
    from job_log
    where finished = 1 and type = 'transformIssue' and step = 'Successful' and datetime(ts,'+6 hours')>datetime('${currDate}')
    ) a
group by ts5) t5 on t1.ts1 = t5.ts5
left join 
(select
      ts6
    , count(1)*6*24 items_per_day --2020-06-03 10:00
from
    (
    select substr(datetime(ts,'+3 hours'),1,15)||'0' ts6  --15,12
    from job_log
    where finished = 1 and type = 'writeIssueToDb' and step = 'Successful' and datetime(ts,'+6 hours')>datetime('${currDate}')
    ) a
group by ts6) t6 on t1.ts1 = t6.ts6`;

        for (let i of env.jobStorage.db.prepare(querySQL).all()) {
            jobsData.push({
                name: i.time,
                jiraIssue: i.JI_items_per_day,
                jiraComments: i.JC_items_per_day,
                jiraWorklog: i.JW_items_per_day,
                transformIssue: i.TI_items_per_day,
                writeIssueToDb: i.WI_items_per_day,
            });
        }

        // экстрополируем последнее значение (вынеси в функцию)
        let timeExtroCoefficient = 10 / (Number.parseInt(currDate.substr(15)) + 1);
        jobsData[jobsData.length - 1].jiraIssue = (jobsData[jobsData.length - 1].jiraIssue * timeExtroCoefficient) | 0;
        jobsData[jobsData.length - 1].jiraComments =
            (jobsData[jobsData.length - 1].jiraComments * timeExtroCoefficient) | 0;
        jobsData[jobsData.length - 1].jiraWorklog =
            (jobsData[jobsData.length - 1].jiraWorklog * timeExtroCoefficient) | 0;
        jobsData[jobsData.length - 1].transformIssue =
            (jobsData[jobsData.length - 1].transformIssue * timeExtroCoefficient) | 0;
        jobsData[jobsData.length - 1].writeIssueToDb =
            (jobsData[jobsData.length - 1].writeIssueToDb * timeExtroCoefficient) | 0;

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
