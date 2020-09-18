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
import { UIProjectStatsRow } from "./UIProjectStatsRow";
import debugjs from "debug";
import { GlobalUIState, ProjectItem, ProjectStats, RunStatus } from "./RunStatus";
import { ProjectStatsApiResponse } from "../monitoring_api/projectStatsApi.types";
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

export const UIProjectStats: React.FC<{
    graphData: any;
    projectStats: ProjectStats;
    globalUIState: GlobalUIState;
    runStatus: RunStatus;
}> = ({ graphData, projectStats, globalUIState, runStatus }) => {
    return useObserver(() => {
        const classes = useStyles();
        debugRender("UIProjectStats");
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
                                <TableCell>error log</TableCell>
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
                                <UIProjectStatsRow
                                    key={projectItem.name}
                                    projectItem={projectItem}
                                    globalUIState={globalUIState}
                                    runStatus={runStatus}
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
