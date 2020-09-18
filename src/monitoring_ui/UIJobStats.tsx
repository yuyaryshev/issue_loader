import { useObserver } from "mobx-react-lite";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import { UIJobStatsRow } from "./UIJobStatsRow";
import debugjs from "debug";
import { GlobalUIState } from "./RunStatus";
import { palette as colors } from "./IssueLoaderColors";
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

const allFields = true;

const parseStatsToProjectArray = (stats: any) => {
    if (!stats) {
        return [];
    }

    if (stats.length == 0) {
        return [
            {
                project: undefined,
                Pprogress: [
                    { progress: 0, color: colors.orange, state: "error" },
                    { progress: 0, color: colors.green, state: "succeded" },
                    { progress: 0, color: colors.yellow, state: "running" },
                    { progress: 0, color: colors.blue, state: "paused" },

                    { progress: 0, color: colors.pink, state: "readyToRun" },
                    { progress: 0, color: colors.salad, state: "waitingDeps" },
                    { progress: 0, color: colors.frost, state: "waitingTime" },
                ],
                failed: 0,
                succeded: 0,
                running: 0,
                paused: 0,

                readyToRun: 0,
                waitingDeps: 0,
                waitingTime: 0,

                total: 0, /// DONT FORGET
            },
        ];
    }

    let result = [];

    let projects = [];

    outerLoop: for (let i of stats) {
        //проверяем, есть ли такой проект
        for (let currPrName of projects) {
            if (i.project == currPrName) {
                // изменяем progress
                // return food;
                for (let currProject of result) {
                    if (currProject.project === i.project) {
                        let failedCount = i.state == "error" ? i.jobsCount : 0;
                        let doneCount = i.state == "succeded" ? i.jobsCount : 0;
                        let runningCount = i.state == "running" ? i.jobsCount : 0;
                        let pausedCount = i.state == "paused" ? i.jobsCount : 0;

                        let readyToRunCount = i.state == "readyToRun" ? i.jobsCount : 0;
                        let waitingDepsCount = i.state == "waitingDeps" ? i.jobsCount : 0;
                        let waitingTimeCount = i.state == "waitingTime" ? i.jobsCount : 0;

                        for (let progressLine of currProject.Pprogress) {
                            if (i.state === progressLine.state) {
                                progressLine.progress += i.jobsCount;
                                break;
                            }
                        }

                        currProject.failed += failedCount;
                        currProject.succeded += doneCount;
                        currProject.running += runningCount;
                        currProject.paused += pausedCount;

                        currProject.readyToRun += readyToRunCount;
                        currProject.waitingDeps += waitingDepsCount;
                        currProject.waitingTime += waitingTimeCount;

                        currProject.total += i.jobsCount;

                        continue outerLoop;
                    }
                }
            }
        }

        // не нашли проекта, создаем его!
        projects.push(i.project);
        let failedCount = i.state == "error" ? i.jobsCount : 0;
        let doneCount = i.state == "succeded" ? i.jobsCount : 0;
        let runningCount = i.state == "running" ? i.jobsCount : 0;
        let pausedCount = i.state == "paused" ? i.jobsCount : 0;

        let readyToRunCount = i.state == "readyToRun" ? i.jobsCount : 0;
        let waitingDepsCount = i.state == "waitingDeps" ? i.jobsCount : 0;
        let waitingTimeCount = i.state == "waitingTime" ? i.jobsCount : 0;

        let localResult = {
            project: i.project,
            Pprogress: [
                { progress: failedCount, color: colors.orange, state: "error" },
                { progress: doneCount, color: colors.green, state: "succeded" },
                { progress: runningCount, color: colors.yellow, state: "running" },
                { progress: pausedCount, color: colors.blue, state: "paused" },

                { progress: readyToRunCount, color: colors.pink, state: "readyToRun" },
                { progress: waitingDepsCount, color: colors.salad, state: "waitingDeps" },
                { progress: waitingTimeCount, color: colors.frost, state: "waitingTime" },
            ],
            failed: failedCount,
            succeded: doneCount,
            running: runningCount,
            paused: pausedCount,

            readyToRun: readyToRunCount,
            waitingDeps: waitingDepsCount,
            waitingTime: waitingTimeCount,

            total: i.jobsCount, /// DONT FORGET
        };
        result.push(localResult);
    }

    return result;
};

const parseStatsToAllStatsArray = (stats: any) => {
    if (!stats) {
        return [];
    }

    if (stats.length == 0) {
        return [
            {
                project: undefined,
                Pprogress: [
                    { progress: 0, color: colors.orange, state: "error" },
                    { progress: 0, color: colors.green, state: "succeded" },
                    { progress: 0, color: colors.yellow, state: "running" },
                    { progress: 0, color: colors.blue, state: "paused" },

                    { progress: 0, color: colors.pink, state: "readyToRun" },
                    { progress: 0, color: colors.salad, state: "waitingDeps" },
                    { progress: 0, color: colors.frost, state: "waitingTime" },
                ],
                failed: 0,
                succeded: 0,
                running: 0,
                paused: 0,

                readyToRun: 0,
                waitingDeps: 0,
                waitingTime: 0,

                total: 0, /// DONT FORGET
            },
        ];
    }

    let result = [];

    let localResult = {
        project: "all",
        Pprogress: [
            { progress: 0, color: colors.orange, state: "error" },
            { progress: 0, color: colors.green, state: "succeded" },
            { progress: 0, color: colors.yellow, state: "running" },
            { progress: 0, color: colors.blue, state: "paused" },

            { progress: 0, color: colors.pink, state: "readyToRun" },
            { progress: 0, color: colors.salad, state: "waitingDeps" },
            { progress: 0, color: colors.frost, state: "waitingTime" },
        ],
        failed: 0,
        succeded: 0,
        running: 0,
        paused: 0,

        readyToRun: 0,
        waitingDeps: 0,
        waitingTime: 0,

        total: 0, /// DONT FORGET
    };

    for (let i of stats) {
        // ALL
        let failedCount = i.state == "error" ? i.jobsCount : 0;
        let doneCount = i.state == "succeded" ? i.jobsCount : 0;
        let runningCount = i.state == "running" ? i.jobsCount : 0;
        let pausedCount = i.state == "paused" ? i.jobsCount : 0;

        let readyToRunCount = i.state == "readyToRun" ? i.jobsCount : 0;
        let waitingDepsCount = i.state == "waitingDeps" ? i.jobsCount : 0;
        let waitingTimeCount = i.state == "waitingTime" ? i.jobsCount : 0;

        //добавляем изменения
        localResult.Pprogress[0].progress += failedCount;
        localResult.Pprogress[1].progress += doneCount;
        localResult.Pprogress[2].progress += runningCount;
        localResult.Pprogress[3].progress += pausedCount;

        localResult.Pprogress[4].progress += readyToRunCount;
        localResult.Pprogress[5].progress += waitingDepsCount;
        localResult.Pprogress[6].progress += waitingTimeCount;

        localResult.failed += failedCount;
        localResult.succeded += doneCount;
        localResult.running += runningCount;
        localResult.paused += pausedCount;

        localResult.readyToRun += readyToRunCount;
        localResult.waitingDeps += waitingDepsCount;
        localResult.waitingTime += waitingTimeCount;

        localResult.total += i.jobsCount;
    }
    result.push(localResult);

    return result;
};

export const UIJobStats: React.FC<{ jobStats: any; globalUIState: GlobalUIState }> = ({ jobStats, globalUIState }) => {
    const classes = useStyles();
    debugRender("UIJobStats");

    let statsProgress: any;
    if (globalUIState.job_stats_checkProjects && !globalUIState.job_stats_checkAll) {
        statsProgress = parseStatsToProjectArray(jobStats.stats);
    } else {
        statsProgress = parseStatsToAllStatsArray(jobStats.stats);
    }

    return useObserver(() => (
        <>
            <Table className={classes.table} size="small">
                <TableHead>
                    <TableRow>
                        {globalUIState.job_stats_checkProjects && !globalUIState.job_stats_checkAll ? (
                            <>
                                <TableCell>project</TableCell>
                                <TableCell style={{ minWidth: 350 }}>progress</TableCell>
                                <TableCell>running</TableCell>
                                <TableCell>succeded</TableCell>
                                <TableCell>failed</TableCell>
                                <TableCell>paused</TableCell>
                                <TableCell>readyToRun</TableCell>
                                <TableCell>waitingDeps</TableCell>
                                <TableCell>waitingTime</TableCell>
                                <TableCell>total</TableCell>
                            </>
                        ) : (
                            <>
                                <TableCell style={{ minWidth: 350 }}>progress</TableCell>
                                <TableCell>running</TableCell>
                                <TableCell>succeded</TableCell>
                                <TableCell>failed</TableCell>
                                <TableCell>paused</TableCell>
                                <TableCell>readyToRun</TableCell>
                                <TableCell>waitingDeps</TableCell>
                                <TableCell>waitingTime</TableCell>
                                <TableCell>total</TableCell>
                            </>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {!jobStats.error ? (
                        statsProgress.map((currData: any) => (
                            <UIJobStatsRow
                                key={`${JSON.stringify(currData.Pprogress)}`}
                                data={currData}
                                globalUIState={globalUIState}
                            />
                        ))
                    ) : (
                        <TableRow>
                            {globalUIState.job_stats_checkProjects && !globalUIState.job_stats_checkAll ? (
                                <>
                                    <TableCell />
                                    <TableCell>{jobStats.error}</TableCell>
                                </>
                            ) : (
                                <>
                                    <TableCell>{jobStats.error}</TableCell>
                                </>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <Typography variant="caption" className={classes.typographyStylesFooter}>
                Загружено: в последний запуск / за 10 минут / за сегодня
            </Typography>
        </>
    ));
};

if ((module as any).hot) {
    (module as any).hot.accept();
}

/*
    [
        {
            project: "test1",
            Pprogress: [
                { progress: 3, color: colors.orange },
                { progress: 4, color: colors.green },
                { progress: 3, color: colors.yellow },
            ],
            args: 1,
            succededJobs: 5,
            failedJobs: 100,
            runningJobs: 20,
        },
        {
            project: "test2",
            Pprogress: [
                { progress: 10, color: colors.orange },
                { progress: 20, color: colors.green },
                { progress: 60, color: colors.yellow },
            ],
            args: 2,
            succededJobs: 1,
            failedJobs: 100,
            runningJobs: 10,
        },
        {
            project: "test3",
            Pprogress: [
                { progress: 30, color: colors.orange },
                { progress: 30, color: colors.green },
                { progress: 30, color: colors.yellow },
            ],
            args: 3,
            succededJobs: 5,
            failedJobs: 50,
            runningJobs: 40,
        },
        {
            project: "test4",
            Pprogress: [
                { progress: 40, color: colors.orange },
                { progress: 30, color: colors.green },
                { progress: 10, color: colors.yellow },
            ],
            args: 4,
            succededJobs: 0,
            failedJobs: 100,
            runningJobs: 0,
        },
    ];
     */

/*
const parseStatsToMyArrayOnGroupingFields = (stats: any) => {
    if (stats.length == 0) {
        return [];
    }
    let result = [];

    let projects = [];

    outerLoop: for (let i of stats) {
        //проверяем, есть ли такой проект
        for (let currPrName of projects) {
            if (i.project == currPrName) {
                // изменяем progress
                // return food;
                for (let currProject of result) {
                    if (currProject.project === i.project) {
                        let failedCount = i.state == "error" ? i.jobsCount : 0;
                        let doneCount = i.state == "done" ? i.jobsCount : 0;
                        let runningCount = i.state == "running" ? i.jobsCount : 0;

                        for (let progressLine of currProject.Pprogress) {
                            if (i.state === progressLine.state) {
                                progressLine.progress += i.jobsCount;
                                break;
                            }
                        }

                        currProject.failed += failedCount;
                        currProject.succeded += doneCount;
                        currProject.running += runningCount;

                        currProject.total += i.jobsCount;

                        continue outerLoop;
                    }
                }
            }
        }

        // не нашли проекта, создаем его!
        projects.push(i.project);
        let failedCount = i.state == "error" ? i.jobsCount : 0;
        let doneCount = i.state == "done" ? i.jobsCount : 0;
        let runningCount = i.state == "running" ? i.jobsCount : 0;

        let localResult = {
            project: i.project,
            Pprogress: [
                { progress: failedCount, color: colors.orange, state: "error" },
                { progress: doneCount, color: colors.green, state: "done" },
                { progress: runningCount, color: colors.yellow, state: "running" },
            ],
            failed: failedCount,
            succeded: doneCount,
            running: runningCount,
            total: i.jobsCount, /// DONT FORGET
        };
        result.push(localResult);
    }

    return result;
};
 */
