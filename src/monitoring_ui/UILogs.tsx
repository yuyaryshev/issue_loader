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
import { globalUIState, GlobalUIState, runStatus } from "./RunStatus";
import IconButton from "@material-ui/core/IconButton";
import ReplayIcon from "@material-ui/icons/Replay";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";

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
    leftMargin16px: {
        marginLeft: "16px",
    },
});

const allFields = true;

export const UILogs: React.FC<{ logs: any; globalUIState: GlobalUIState }> = ({ logs, globalUIState }) => {
    const classes = useStyles();
    debugRender("UILogs");
    return useObserver(() => (
        <>
            <TableRow>
                <IconButton color="primary" onClick={globalUIState.requestRefreshLogs}>
                    <ReplayIcon />
                </IconButton>
                <FormControlLabel
                    control={
                        <Checkbox
                            className={classes.leftMargin16px}
                            checked={globalUIState.fullLogs}
                            onChange={globalUIState.toggleFullLogs}
                            value="checkedB"
                            color="primary"
                        />
                    }
                    label="Расширенный доступ к логам"
                />
            </TableRow>
            <TableRow>
                {globalUIState.fullLogs ? (
                    <>
                        <TextField
                            className={classes.filterTextField}
                            label="Добавьте фильтр вашему запросу"
                            defaultValue={runStatus.logsFilter}
                            onChange={globalUIState.setLogsFilter}
                        />
                    </>
                ) : undefined}

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
                        {logs.map((log: any) => (
                            <UILogRow key={log.id} log={log} globalUIState={globalUIState} />
                        ))}
                    </TableBody>
                </Table>
                <Typography variant="caption" className={classes.typographyStylesFooter}>
                    Загружено: в последний запуск / за 10 минут / за сегодня
                </Typography>
            </TableRow>
        </>
    ));
};

if ((module as any).hot) {
    (module as any).hot.accept();
}
