import { useObserver } from "mobx-react-lite";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import PauseIcon from "@material-ui/icons/Pause";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import ReplayIcon from "@material-ui/icons/Replay";
import IconButton from "@material-ui/core/IconButton";
import debugjs from "debug";
import { GlobalUIState } from "./RunStatus";

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

export const UIIssueRow: React.FC<{ issue: any; globalUIState: GlobalUIState }> = ({ issue, globalUIState }) => {
    debugRender("UIIssueRow");
    const classes = useStyles();
    return useObserver(() => (
        <TableRow>
            <TableCell>{issue.id}</TableCell>
            <TableCell>{issue.issueKey ? issue.issueKey : "?"}</TableCell>
            <TableCell>
                {issue.paused ? (
                    <IconButton color="primary" onClick={issue.resume}>
                        <PlayArrowIcon />
                    </IconButton>
                ) : (
                    <IconButton color="primary" onClick={issue.pause}>
                        <PauseIcon />
                    </IconButton>
                )}
                {issue.paused ? (
                    <IconButton color="primary" onClick={issue.makeStale}>
                        <ReplayIcon />
                    </IconButton>
                ) : (
                    undefined
                )}
            </TableCell>
            <TableCell>{issue.paused}</TableCell>
            <TableCell>{issue.succeded}</TableCell>
            <TableCell>{issue.state}</TableCell>

            {globalUIState.jobDetailsInGrid ? (
                <>
                    <TableCell>{issue.priority}</TableCell>
                    <TableCell>{issue.cancelled}</TableCell>
                    <TableCell>{issue.predecessorsDone}</TableCell>
                    <TableCell>{issue.jobContext}</TableCell>
                    <TableCell>{issue.retryIntervalIndex}</TableCell>
                    <TableCell>{issue.timesSaved}</TableCell>
                    <TableCell>{issue.project}</TableCell>
                    <TableCell>{issue.updated}</TableCell>
                </>
            ) : (
                undefined
            )}
        </TableRow>
    ));
};

if ((module as any).hot) {
    (module as any).hot.accept();
}
