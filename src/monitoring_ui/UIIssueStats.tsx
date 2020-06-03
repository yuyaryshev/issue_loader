import { useObserver } from "mobx-react-lite";
import { toJS } from "mobx";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import { UIIssueStatsRow } from "./UIIssueStatsRow";
import debugjs from "debug";
import { GlobalUIState, ProjectItem, ProjectStats } from "./RunStatus";
import { IssueStatsApiResponse } from "../monitoring_api/issueStatsApi.types";
import { objectIterator } from "Ystd";
import moment from "moment";
import { UILineChart } from "./UILineChart";

const debugRender = debugjs("render");

const useStyles = makeStyles({
    table: {
        minWidth: 900,
    },
    filterTextField: {
        marginLeft: "16px",
        width: "900px",
    },
    typographyStylesFooter: {
        margin: "16px",
        width: "100%",
    },
    stepColumn: {
        width: "1000px",
    },
});

// const parseStatsToProjectArray = (stats: any) => {
//     if (!stats) {
//         return [];
//     }
//
//     if (stats.length == 0) {
//         return [];
//     }
//     let result = [];
//
//     let projects = [];
//
//     outerLoop: for (let i of stats) {
//         //проверяем, есть ли такой проект
//         for (let currPrName of projects) {
//             if (i.project == currPrName) {
//                 // изменяем progress
//                 // return food;
//                 for (let currProject of result) {
//                     if (currProject.project === i.project) {
//                         let jiraCount = i.stage == "01_jira" ? i.issueCount : 0;
//                         let transformCount = i.stage == "02_transform" ? i.issueCount : 0;
//                         let dbCount = i.stage == "03_db" ? i.issueCount : 0;
//                         let succededCount = i.stage == "99_succeded" ? i.issueCount : 0;
//
//                         for (let progressLine of currProject.Pprogress) {
//                             if (i.stage === progressLine.stage) {
//                                 progressLine.progress += i.issueCount;
//                                 break;
//                             }
//                         }
//
//                         currProject.onJira += jiraCount;
//                         currProject.onTransform += transformCount;
//                         currProject.onDB += dbCount;
//                         currProject.succeded += succededCount;
//
//                         currProject.total += i.issueCount;
//
//                         continue outerLoop;
//                     }
//                 }
//             }
//         }
//
//         // не нашли проекта, создаем его!
//         projects.push(i.project);
//         let jiraCount = i.stage == "01_jira" ? i.issueCount : 0;
//         let transformCount = i.stage == "02_transform" ? i.issueCount : 0;
//         let dbCount = i.stage == "03_db" ? i.issueCount : 0;
//         let succededCount = i.stage == "99_succeded" ? i.issueCount : 0;
//
//         let localResult = {
//             project: i.project,
//             Pprogress: [
//                 { progress: jiraCount, color: colors.blue, stage: "01_jira" },
//                 { progress: transformCount, color: colors.pink, stage: "02_transform" },
//                 { progress: dbCount, color: colors.yellow, stage: "03_db" },
//                 { progress: succededCount, color: colors.green, stage: "99_succeded" },
//             ],
//             onJira: jiraCount,
//             onTransform: transformCount,
//             onDB: dbCount,
//             succeded: succededCount,
//             total: i.issueCount, /// DONT FORGET
//         };
//         result.push(localResult);
//     }
//
//     return result;
// };
//
// const parseStatsToAllStatsArray = (stats: any) => {
//     if (!stats) {
//         return [];
//     }
//
//     if (stats.length == 0) {
//         return [];
//     }
//
//     let result = [];
//
//     let localResult = {
//         project: "all",
//         Pprogress: [
//             { progress: 0, color: colors.blue, stage: "01_jira" },
//             { progress: 0, color: colors.pink, stage: "02_transform" },
//             { progress: 0, color: colors.yellow, stage: "03_db" },
//             { progress: 0, color: colors.green, stage: "99_succeded" },
//         ],
//         onJira: 0,
//         onTransform: 0,
//         onDB: 0,
//         succeded: 0,
//         total: 0, /// DONT FORGET
//     };
//
//     for (let i of stats) {
//         // ALL
//         let jiraCount = i.stage == "01_jira" ? i.issueCount : 0;
//         let transformCount = i.stage == "02_transform" ? i.issueCount : 0;
//         let dbCount = i.stage == "03_db" ? i.issueCount : 0;
//         let succeded = i.stage == "99_succeded" ? i.issueCount : 0;
//
//         //добавляем изменения
//         localResult.Pprogress[0].progress += jiraCount;
//         localResult.Pprogress[1].progress += transformCount;
//         localResult.Pprogress[2].progress += dbCount;
//         localResult.Pprogress[3].progress += succeded;
//
//         localResult.onJira += jiraCount;
//         localResult.onTransform += transformCount;
//         localResult.onDB += dbCount;
//         localResult.succeded += succeded;
//
//         localResult.total += i.issueCount;
//     }
//     result.push(localResult);
//
//     return result;
// };

const data1 = [
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

const data2 = [
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

export const UIIssueStats: React.FC<{ graphData: any; projectStats: ProjectStats; globalUIState: GlobalUIState }> = ({
    graphData,
    projectStats,
    globalUIState,
}) => {
    return useObserver(() => {
        const classes = useStyles();
        debugRender("UIIssueStats");
        return (
            <>
                <UILineChart data={graphData.jobsData} graph={"jobs"} globalUIState={globalUIState} />
                <UILineChart data={graphData.resourcesData} graph={"resources"} globalUIState={globalUIState} />
                <UILineChart data={graphData.storageData} graph={"storage"} globalUIState={globalUIState} />
                {projectStats.loading && moment().diff(projectStats.loading) > 2000 ? "Loading ..." : undefined}
                {projectStats.error ? (
                    projectStats.error
                ) : (
                    <Table className={classes.table} size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>project</TableCell>
                                <TableCell style={{ minWidth: 200 }}>progress</TableCell>
                                <TableCell>error</TableCell>
                                <TableCell>running</TableCell>
                                <TableCell>succeded</TableCell>
                                <TableCell>db</TableCell>
                                <TableCell>transform</TableCell>
                                <TableCell>jira</TableCell>
                                <TableCell>total</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.values(projectStats.projects).map((projectItem: ProjectItem) => (
                                <UIIssueStatsRow
                                    key={projectItem.name}
                                    projectItem={projectItem}
                                    globalUIState={globalUIState}
                                />
                            ))}
                        </TableBody>
                    </Table>
                )}
                <Typography variant="caption" className={classes.typographyStylesFooter}>
                    Загружено: в последний запуск / за 10 минут / за сегодня
                </Typography>
            </>
        );
    });
};

if ((module as any).hot) {
    (module as any).hot.accept();
}
