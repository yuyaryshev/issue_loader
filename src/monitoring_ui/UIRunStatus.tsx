import React from "react";
import { toJS } from "mobx";
import { useObserver } from "mobx-react-lite";
import { UIIssues } from "./UIIssues";
import { UIJobs } from "./UIJobs";
import { UILogs } from "./UILogs";
import { UIProjectStats } from "./UIProjectStats";
import { UIJobStats } from "./UIJobStats";
import { UIRunIssues } from "./UIRunIssues";
import { UISQL } from "./UISQL";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Checkbox from "@material-ui/core/Checkbox";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import ReplayIcon from "@material-ui/icons/Replay";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import WorkOutlineIcon from "@material-ui/icons/WorkOutline";
import NextWeekIcon from "@material-ui/icons/NextWeek";
import SubjectIcon from "@material-ui/icons/Subject";
import LinearProgress from "@material-ui/core/LinearProgress";
import AssessmentIcon from "@material-ui/icons/Assessment";
import VisibilityIcon from "@material-ui/icons/Visibility";
import PowerSettingsNewIcon from "@material-ui/icons/PowerSettingsNew";
import TextField from "@material-ui/core/TextField";

import debugjs from "debug";
import { StatusIcon } from "./StatusIcon";
import { GlobalUIState, runStatus, RunStatus, tabNames } from "./RunStatus";

const debugRender = debugjs("render");

const useStyles = makeStyles({
    root: {
        background: "#AAAAAA",
        padding: "16px",
        // margin: "16px"
    },
    runStatusStyles: {
        //        width: "34%",
        overflowX: "auto",
        // padding: "16px",
        // margin: "16px"
    },
    streamsStyles: {
        //        width: "66%",
        overflowX: "auto",
        // padding: "16px",
        // margin: "16px"
    },
    typographyStyles: {
        margin: "16px",
    },
    typographyStylesFooter: {
        margin: "16px",
        width: "100%",
    },
    leftMargin16px: {
        marginLeft: "16px",
    },
    gridControlTestStyle: {
        width: "1300px",
        height: "100%",
    },
    colorPrimary: {
        backgroundColor: "#ff0000",
    },
    barColorPrimary: {
        backgroundColor: "#39b370",
    },
    table: {},
});

const UIRunStatusLastRefreshTs: React.FC<{ runStatus: RunStatus; globalUIState: GlobalUIState }> = ({
    runStatus,
    globalUIState,
}) => {
    return useObserver(() => <>{runStatus.lastRefresh}</>);
};

export const UIRunStatus: React.FC<{ runStatus: RunStatus; globalUIState: GlobalUIState }> = ({
    runStatus,
    globalUIState,
}) => {
    return useObserver(() => {
        const classes = useStyles();
        debugRender("UIRunStatus");

        return (
            <Grid container spacing={3} className={classes.root}>
                <Grid item>
                    <Paper className={classes.runStatusStyles}>
                        <Typography className={classes.typographyStyles} variant="h4">
                            Статус {runStatus.instanceName}
                        </Typography>
                        <Table className={classes.table} aria-label="simple table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Параметр</TableCell>
                                    <TableCell>Значение</TableCell>
                                    <TableCell>Icon</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Подключение к серверу Issue Loader
                                    </TableCell>
                                    <TableCell></TableCell>
                                    <TableCell>
                                        <StatusIcon status={runStatus.connected} />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Состояние БД Oracle
                                    </TableCell>
                                    <TableCell>{runStatus.globalMessages.oracle}</TableCell>
                                    <TableCell>
                                        <StatusIcon status={runStatus.globalMessages.oracle} />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Состояние БД SQLite
                                    </TableCell>
                                    <TableCell>{runStatus.globalMessages.sqllite}</TableCell>
                                    <TableCell>
                                        <StatusIcon status={runStatus.globalMessages.sqllite} />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Состояние Jira
                                    </TableCell>
                                    <TableCell>{runStatus.globalMessages.jira}</TableCell>
                                    <TableCell>
                                        <StatusIcon status={runStatus.globalMessages.jira} />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Запросов к Jira в секунду
                                    </TableCell>
                                    <TableCell>{runStatus.jiraStatus.jiraRequestsPerSecond}</TableCell>
                                    <TableCell>
                                        {runStatus.jiraStatus.jiraRequestsPerSecond > 20 ? (
                                            <StatusIcon status="warn" />
                                        ) : undefined}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Количество ошибок к Jira в ответах
                                    </TableCell>
                                    <TableCell>{runStatus.jiraStatus.JiraResposeErrorsCount}</TableCell>
                                    <TableCell>
                                        {runStatus.jiraStatus.JiraResposeErrorsCount > 1 ? (
                                            <StatusIcon status="warn" />
                                        ) : undefined}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Среднее время отклика JIra
                                    </TableCell>
                                    <TableCell>{runStatus.jiraStatus.JiraResponseAverageTime}</TableCell>
                                    <TableCell>
                                        {runStatus.jiraStatus.JiraResponseAverageTime > 1 ? (
                                            <StatusIcon status="warn" />
                                        ) : undefined}
                                    </TableCell>
                                </TableRow>

                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Последний запуск
                                    </TableCell>
                                    <TableCell>{runStatus.lastRun}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Время сервера Jira
                                    </TableCell>
                                    <TableCell>{runStatus.jiraTime}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Статус обновлен
                                    </TableCell>
                                    <TableCell>
                                        <UIRunStatusLastRefreshTs runStatus={runStatus} globalUIState={globalUIState} />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton color="primary" onClick={globalUIState.requestFullRefresh}>
                                            <ReplayIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Версия
                                    </TableCell>
                                    <TableCell>{runStatus.versionStr}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Запреты на запуск job
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        {runStatus.startLocks}
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>

                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        jobStorage.unloading
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        {runStatus.unloading}
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Контекстов загружено
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        {runStatus.contextsLoaded} из {runStatus.maxContextsInMem}
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        contexts running / readyToRun
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        {runStatus.contextsRunning} / {runStatus.contextsReadyToRun}
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>

                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Ресурсы Jira
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        {Math.round(
                                            (100.0 * runStatus.resources.jira) / runStatus.resourcesLimits.jira
                                        ) + "%"}
                                    </TableCell>
                                    <TableCell>
                                        <LinearProgress
                                            variant="determinate"
                                            value={(100.0 * runStatus.resources.jira) / runStatus.resourcesLimits.jira}
                                            classes={{
                                                colorPrimary: classes.colorPrimary,
                                                barColorPrimary: classes.barColorPrimary,
                                            }}
                                        />
                                        <br />
                                        {`${runStatus.resources.jira} / ${runStatus.resourcesLimits.jira}`}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Ресурсы БД
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        {Math.round((100.0 * runStatus.resources.db) / runStatus.resourcesLimits.db) +
                                            "%"}
                                    </TableCell>
                                    <TableCell>
                                        <LinearProgress
                                            variant="determinate"
                                            value={(100.0 * runStatus.resources.db) / runStatus.resourcesLimits.db}
                                            classes={{
                                                colorPrimary: classes.colorPrimary,
                                                barColorPrimary: classes.barColorPrimary,
                                            }}
                                        />
                                        <br />
                                        {`${runStatus.resources.db} / ${runStatus.resourcesLimits.db}`}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Ресурсы CPU
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        {Math.round((100.0 * runStatus.resources.cpu) / runStatus.resourcesLimits.cpu) +
                                            "%"}
                                    </TableCell>
                                    <TableCell>
                                        <LinearProgress
                                            variant="determinate"
                                            value={(100.0 * runStatus.resources.cpu) / runStatus.resourcesLimits.cpu}
                                            classes={{
                                                colorPrimary: classes.colorPrimary,
                                                barColorPrimary: classes.barColorPrimary,
                                            }}
                                        />
                                        <br />
                                        {`${runStatus.resources.cpu} / ${runStatus.resourcesLimits.cpu}`}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Автогенерация задач
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        {runStatus.generateIssues ? "вкл" : "выкл"}
                                    </TableCell>
                                </TableRow>
                                {globalUIState.statusTab === "Project Stats" ? (
                                    <TableRow>
                                        <TableCell component="th" scope="row">
                                            Задач в очереди
                                        </TableCell>
                                        <TableCell component="th" scope="row">
                                            {runStatus.contextsInQueue}
                                        </TableCell>
                                    </TableRow>
                                ) : undefined}
                                <TableRow></TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        <TextField
                                            label="Для получения прав администратора"
                                            type="password"
                                            defaultValue={runStatus.pass}
                                            onChange={globalUIState.setPass}
                                            inputProps={{ maxLength: 18 }}
                                        />
                                    </TableCell>
                                    <TableCell />
                                    <TableCell>
                                        <StatusIcon status={runStatus.admitted} />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        {runStatus.importExportMode === "" ? (
                                            <>
                                                <Button onClick={globalUIState.import} color="primary">
                                                    import
                                                </Button>
                                                <Button onClick={globalUIState.export} color="primary">
                                                    export
                                                </Button>
                                            </>
                                        ) : (
                                            runStatus.importExportMode
                                        )}
                                    </TableCell>
                                    <TableCell></TableCell>
                                    <TableCell>
                                        <LinearProgress
                                            variant="determinate"
                                            value={
                                                (100.0 * runStatus.importExportCurrent) /
                                                (runStatus.importExportTotal || 1)
                                            }
                                            classes={{
                                                colorPrimary: classes.colorPrimary,
                                                barColorPrimary: classes.barColorPrimary,
                                            }}
                                        />
                                        <br />
                                        {`${runStatus.importExportCurrent} / ${runStatus.importExportTotal}`}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" scope="row">
                                        Отключить сервер
                                    </TableCell>
                                    <TableCell></TableCell>
                                    <TableCell>
                                        <IconButton
                                            color="primary"
                                            onClick={globalUIState.shutdown}
                                            disabled={!runStatus.admitted}
                                        >
                                            <PowerSettingsNewIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>

                        {globalUIState.statusTab === "Jobs" ? (
                            <>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            className={classes.leftMargin16px}
                                            checked={globalUIState.jobDetailsInGrid}
                                            onChange={globalUIState.toggleJobDetailsInGrid}
                                            value="checkedB"
                                            color="primary"
                                        />
                                    }
                                    label="Все поля Job'ов"
                                />
                            </>
                        ) : undefined}

                        {globalUIState.statusTab === "Project Stats" ? (
                            <>
                                <RadioGroup
                                    defaultValue={globalUIState.issue_stats_checkProjects ? "projects" : "all"}
                                    name="customized-radios"
                                    className={classes.leftMargin16px}
                                >
                                    <FormControlLabel
                                        value="projects"
                                        control={
                                            <Radio
                                                onChange={() => {
                                                    globalUIState.issue_stats_checkAll = false;
                                                    globalUIState.issue_stats_checkProjects = true;
                                                }}
                                            />
                                        }
                                        label="по проектам"
                                    />
                                    <FormControlLabel
                                        value="all"
                                        control={
                                            <Radio
                                                onChange={() => {
                                                    globalUIState.issue_stats_checkAll = true;
                                                    globalUIState.issue_stats_checkProjects = false;
                                                }}
                                            />
                                        }
                                        label="суммарно"
                                    />
                                </RadioGroup>
                            </>
                        ) : undefined}

                        {globalUIState.statusTab === "JobStats" ? (
                            <>
                                <RadioGroup
                                    defaultValue={globalUIState.job_stats_checkProjects ? "projects" : "all"}
                                    name="customized-radios"
                                    className={classes.leftMargin16px}
                                >
                                    <FormControlLabel
                                        value="projects"
                                        control={
                                            <Radio
                                                onChange={() => {
                                                    globalUIState.job_stats_checkAll = false;
                                                    globalUIState.job_stats_checkProjects = true;
                                                }}
                                            />
                                        }
                                        label="по проектам"
                                    />
                                    <FormControlLabel
                                        value="all"
                                        control={
                                            <Radio
                                                onChange={() => {
                                                    globalUIState.job_stats_checkAll = true;
                                                    globalUIState.job_stats_checkProjects = false;
                                                }}
                                            />
                                        }
                                        label="суммарно"
                                    />
                                </RadioGroup>
                            </>
                        ) : undefined}

                        <p>
                            <Typography className={classes.typographyStylesFooter} variant="caption">
                                Данные на этой странице обновляются автоматически (F5 не требуется).
                            </Typography>
                        </p>
                        <p>
                            <Typography className={classes.typographyStylesFooter} variant="caption">
                                Эти же данные в формате JSON доступны по адресу /api/runStatus.
                            </Typography>
                        </p>
                    </Paper>
                </Grid>
                <Grid item className={classes.gridControlTestStyle}>
                    <Paper className={classes.streamsStyles}>
                        <Tabs
                            value={globalUIState.statusTab ? tabNames.indexOf(globalUIState.statusTab!) : 0}
                            indicatorColor="primary"
                            textColor="primary"
                            onChange={globalUIState.statusTabChanged}
                            aria-label="disabled tabs example"
                        >
                            <Tab label="Issues" icon={<WorkOutlineIcon />} />
                            <Tab label="Jobs" icon={<WorkOutlineIcon />} />
                            <Tab label="Logs" icon={<SubjectIcon />} />
                            <Tab label="Project Stats" icon={<AssessmentIcon />} />
                            <Tab label="JobStats" icon={<AssessmentIcon />} />
                            <Tab
                                label="Run Issues"
                                icon={<NextWeekIcon />}
                                disabled={!runStatus.admitted}
                                title="Только с правами администратора"
                            />
                            <Tab
                                label="SQL"
                                icon={<VisibilityIcon />}
                                disabled={!runStatus.admitted}
                                title="Только с правами администратора"
                            />
                        </Tabs>

                        {!globalUIState.statusTab || globalUIState.statusTab === "Issues" ? (
                            <>
                                <UIIssues issues={runStatus.issues} globalUIState={globalUIState} />
                            </>
                        ) : undefined}

                        {!globalUIState.statusTab || globalUIState.statusTab === "Jobs" ? (
                            <>
                                <UIJobs jobs={runStatus.jobs} globalUIState={globalUIState} />
                            </>
                        ) : undefined}

                        {globalUIState.statusTab === "Logs" ? (
                            <>
                                <UILogs logs={runStatus.logs} globalUIState={globalUIState} />
                            </>
                        ) : undefined}

                        {globalUIState.statusTab === "Project Stats" ? (
                            <>
                                <UIProjectStats
                                    graphData={runStatus.graph}
                                    projectStats={runStatus.projectStats}
                                    globalUIState={globalUIState}
                                    runStatus={runStatus}
                                />
                            </>
                        ) : undefined}

                        {globalUIState.statusTab === "JobStats" ? (
                            <>
                                <UIJobStats jobStats={runStatus.jobStats} globalUIState={globalUIState} />
                            </>
                        ) : undefined}

                        {globalUIState.statusTab === "RunIssues" ? (
                            <>
                                <UIRunIssues runStatus={runStatus} globalUIState={globalUIState} />
                            </>
                        ) : undefined}

                        {globalUIState.statusTab === "SQL" ? (
                            <>
                                <UISQL runStatus={runStatus} globalUIState={globalUIState} />
                            </>
                        ) : undefined}
                    </Paper>
                </Grid>
            </Grid>
        );
    });
};

if ((module as any).hot) {
    (module as any).hot.accept();
}

//     @observable knownErrors = [];

// <Grid item xm={6}>
// <Paper className={classes.streamsStyles}>
// <Typography className={classes.typographyStyles} variant="h4">
//     Потоки загрузки
// </Typography>
// <UILoadStreams streams={runStatus.streams} />
// </Paper>
// </Grid>
