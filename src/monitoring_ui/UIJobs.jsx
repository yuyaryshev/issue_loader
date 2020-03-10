import { useObserver } from "mobx-react-lite";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import PauseIcon from "@material-ui/icons/Pause";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import ReplayIcon from "@material-ui/icons/Replay";
import IconButton from "@material-ui/core/IconButton";
import { useSnackbar } from "notistack";
import TextField from "@material-ui/core/TextField";
import { UIJobRow } from "./UIJobRow";
import debugjs from "debug";
const debugRender = debugjs("render");

const useStyles = makeStyles({
    table: {
        minWidth: 650,
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
        width: "200px",
    },
});

const allFields = true;

export function UIJobs({ jobs, globalUIState }) {
    const classes = useStyles();
    debugRender("UIJobs");
    return useObserver(() => (
        <>
            <TextField
                className={classes.filterTextField}
                label="Filter"
                defaultValue={globalUIState.jobsFilter}
                onChange={globalUIState.setJobsFilter}
            />
            <Table className={classes.table} size="small">
                <TableHead>
                    <TableRow>
                        {/*<TableCell align="right">Ок?</TableCell>
                        <TableCell className={classes.stepColumn}>Шаг</TableCell>*/}

                        <TableCell>Id</TableCell>
                        <TableCell>Actions</TableCell>
                        <TableCell>parent</TableCell>
                        <TableCell>jobType</TableCell>
                        <TableCell>paused</TableCell>
                        <TableCell>succeded</TableCell>
                        <TableCell>prevError</TableCell>

                        {globalUIState.jobDetailsInGrid ? (
                            <>
                                <TableCell>priority</TableCell>
                                <TableCell>cancelled</TableCell>
                                <TableCell>updatedTs</TableCell>

                                <TableCell>startedTs</TableCell>
                                <TableCell>finishedTs</TableCell>
                                <TableCell>createdTs</TableCell>
                                <TableCell>retryIntervalIndex</TableCell>

                                <TableCell>nextRetryTs</TableCell>

                                <TableCell>key</TableCell>
                                <TableCell>deps_succeded</TableCell>
                                <TableCell>retryIntervalIndex</TableCell>
                                <TableCell>nextRunTs</TableCell>
                                <TableCell>timesSaved</TableCell>
                            </>
                        ) : (
                            undefined
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {jobs
                        .filter(job => {
                            return (
                                !globalUIState.jobsFilter ||
                                !globalUIState.jobsFilter.trim().length ||
                                job.jsonUpper.includes(globalUIState.jobsFilter.trim().toUpperCase())
                            );
                        })
                        .map(job => (
                            <UIJobRow key={job.id} job={job} globalUIState={globalUIState} />
                        ))}
                </TableBody>
            </Table>
            <Typography variant="caption" className={classes.typographyStyles}>
                Загружено: в последний запуск / за 10 минут / за сегодня
            </Typography>
        </>
    ));
}

if (module.hot) {
    module.hot.accept();
}
