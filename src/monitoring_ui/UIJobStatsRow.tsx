import { useObserver } from "mobx-react-lite";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
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
        width: "20px",
    },
});

const allFields = true;

export const UIJobStatsRow: React.FC<{ data: any; globalUIState: GlobalUIState }> = ({ data, globalUIState }) => {
    debugRender("UIJobStatsRow");
    // react-native-multicolor-progress-bar
    const classes = useStyles();

    return useObserver(() => (
        <TableRow className={classes.table}>
            {globalUIState.job_stats_checkProjects && !globalUIState.job_stats_checkAll ? (
                <>
                    <TableCell>{data.project}</TableCell>
                </>
            ) : (
                undefined
            )}
            <TableCell>{data.Pprogress.toString()}</TableCell>
            <TableCell>{data.running}</TableCell>
            <TableCell>{data.succeded}</TableCell>
            <TableCell>{data.failed}</TableCell>
            <TableCell>{data.paused}</TableCell>
            <TableCell>{data.readyToRun}</TableCell>
            <TableCell>{data.waitingDeps}</TableCell>
            <TableCell>{data.waitingTime}</TableCell>
            <TableCell>{data.total}</TableCell>
        </TableRow>
    ));
};

if ((module as any).hot) {
    (module as any).hot.accept();
}
