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
import debugjs from "debug";
const debugRender = debugjs("render");

const useStyles = makeStyles({
    table: {
        minWidth: 650,
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

export function UIJobRow({ job, globalUIState }) {
    debugRender("UIJobRow");
    const classes = useStyles();
    return useObserver(() => (
        <TableRow>
            <TableCell>{job.id}</TableCell>
            <TableCell>
                {job.paused ? (
                    <IconButton color="primary" onClick={job.resume}>
                        <PlayArrowIcon />
                    </IconButton>
                ) : (
                    <IconButton color="primary" onClick={job.pause}>
                        <PauseIcon />
                    </IconButton>
                )}
                {job.paused ? (
                    <IconButton color="primary" onClick={job.makeStale}>
                        <ReplayIcon />
                    </IconButton>
                ) : (
                    undefined
                )}
            </TableCell>
            <TableCell>{job.parent}</TableCell>
            <TableCell>{job.jobType}</TableCell>
            <TableCell>{job.paused}</TableCell>
            <TableCell>{job.succeded}</TableCell>
            <TableCell>{job.prevError}</TableCell>

            {globalUIState.jobDetailsInGrid ? (
                <>
                    <TableCell>{job.priority}</TableCell>
                    <TableCell>{job.cancelled}</TableCell>
                    <TableCell>{undefined /*job.updatedTs*/}</TableCell>
                    <TableCell>{job.startedTs}</TableCell>
                    <TableCell>{job.finishedTs}</TableCell>
                    <TableCell>{job.createdTs}</TableCell>
                    <TableCell>{job.retryIntervalIndex}</TableCell>
                    <TableCell>{job.nextRetryTs}</TableCell>
                    <TableCell>{job.key}</TableCell>
                    <TableCell>{job.deps_succeded}</TableCell>
                    <TableCell>{job.retryIntervalIndex}</TableCell>
                    <TableCell>{job.nextRunTs}</TableCell>
                    <TableCell>{job.timesSaved}</TableCell>
                </>
            ) : (
                undefined
            )}
        </TableRow>
    ));
}

if (module.hot) {
    module.hot.accept();
}
