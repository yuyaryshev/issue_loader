import React from "react";
import { useObserver } from "mobx-react-lite";
import { UIJobs } from "./UIJobs";
import { UILogs } from "./UILogs";
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
import FormControlLabel from "@material-ui/core/FormControlLabel";
import ReplayIcon from "@material-ui/icons/Replay";
import IconButton from "@material-ui/core/IconButton";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import WorkOutlineIcon from "@material-ui/icons/WorkOutline";
import SubjectIcon from "@material-ui/icons/Subject";

import debugjs from "debug";

const debugRender = debugjs("render");

import { StatusIcon } from "./StatusIcon";

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
});

function UIRunStatusLastRefreshTs({ runStatus, globalUIState }) {
    return useObserver(() => <>{runStatus.lastRefresh}</>);
}

export function UIRunStatus({ runStatus, globalUIState }) {
    const classes = useStyles();
    debugRender("UIRunStatus");
    return useObserver(() => (
        <Grid container spacing={2} className={classes.root}>
            <Grid item xm={6}>
                <Paper className={classes.runStatusStyles}>
                    <Typography className={classes.typographyStyles} variant="h4">
                        Статус {runStatus.instanceName}
                    </Typography>
                    <Table className={classes.table} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Параметр</TableCell>
                                <TableCell>Значение</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell component="th" scope="row">
                                    Подключение к серверу Issue Loader
                                </TableCell>
                                <TableCell>
                                    <StatusIcon status={runStatus.connected} />
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell component="th" scope="row">
                                    Последний запуск
                                </TableCell>
                                <TableCell>{runStatus.lastRun}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell component="th" scope="row">
                                    Время сервера Jira
                                </TableCell>
                                <TableCell>{runStatus.jiraTime}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell component="th" scope="row">
                                    Статус обновлен
                                </TableCell>
                                <TableCell>
                                    <UIRunStatusLastRefreshTs runStatus={runStatus} globalUIState={globalUIState} />
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
                            </TableRow>
                        </TableBody>
                    </Table>
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
            <Grid item xm={6}>
                <Paper className={classes.streamsStyles}>
                    <Tabs
                        value={globalUIState.statusTab}
                        indicatorColor="primary"
                        textColor="primary"
                        onChange={globalUIState.statusTabChanged}
                        aria-label="disabled tabs example"
                    >
                        <Tab label="Jobs" icon={<WorkOutlineIcon />} />
                        <Tab label="Log" icon={<SubjectIcon />} />
                    </Tabs>

                    {globalUIState.statusTab === 0 ? (
                        <>
                            <UIJobs jobs={runStatus.jobs} globalUIState={globalUIState} />
                        </>
                    ) : (
                        undefined
                    )}

                    {globalUIState.statusTab === 1 ? (
                        <>
                            <UILogs logs={runStatus.logs} globalUIState={globalUIState} />
                        </>
                    ) : (
                        undefined
                    )}
                </Paper>
            </Grid>
        </Grid>
    ));
}

if (module.hot) {
    module.hot.accept();
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
