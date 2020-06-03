import { useObserver } from "mobx-react-lite";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";
import { UILogRow } from "./UILogRow";
import debugjs from "debug";
import { GlobalUIState } from "./RunStatus";

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

export const UILogs: React.FC<{ logs: any; globalUIState: GlobalUIState }> = ({ logs, globalUIState }) => {
    const classes = useStyles();
    debugRender("UILogs");
    return useObserver(() => (
        <>
            <TextField
                className={classes.filterTextField}
                label="Filter"
                defaultValue={globalUIState.logsFilter}
                onChange={globalUIState.setLogsFilter}
            />
            <Table className={classes.table} size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>ts</TableCell>
                        <TableCell>cpl</TableCell>
                        <TableCell>severity</TableCell>
                        <TableCell>prefix</TableCell>
                        <TableCell>message</TableCell>
                        <TableCell>data</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {logs
                        .filter((log: any) => {
                            return (
                                !globalUIState.logsFilter ||
                                !globalUIState.logsFilter.trim().length ||
                                log.jsonUpper.includes(globalUIState.logsFilter.trim().toUpperCase())
                            );
                        })
                        .map((log: any) => (
                            <UILogRow key={log.id} log={log} globalUIState={globalUIState} />
                        ))}
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
