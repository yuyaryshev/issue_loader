import { useObserver } from "mobx-react-lite";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import debugjs from "debug";
import { globalUIState, GlobalUIState, runStatus } from "./RunStatus";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import IconButton from "@material-ui/core/IconButton";
import AccessibleForwardIcon from "@material-ui/icons/AccessibleForward";
import DataTable, { createTheme } from "react-data-table-component";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";

const debugRender = debugjs("render");

const useStyles = makeStyles({
    table: {
        minWidth: 650,
    },
    filterTextField: {
        marginLeft: "16px",
        width: "900px",
        marginBottom: "16px",
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
    leftTopMargin16px: {
        marginLeft: "16px",
        marginTop: "16px",
    },
    leftBottomMargin16px: {
        marginLeft: "16px",
        marginBottom: "16px",
    },
});

export const UISQL: React.FC<{ runStatus: any; globalUIState: GlobalUIState }> = ({ runStatus, globalUIState }) => {
    const classes = useStyles();
    debugRender("UIIssues");
    return useObserver(() => (
        <>
            <TextField
                className={classes.filterTextField}
                label="sql code..."
                defaultValue={runStatus.sql}
                onChange={globalUIState.setSQLtext}
                multiline
                rows="3"
                rowsMax="10"
                variant="outlined"
            />
            <IconButton color={"primary"} onClick={globalUIState.sendSelectForSQLite}>
                <PlayArrowIcon />
            </IconButton>

            <TextField
                className={classes.filterTextField}
                label="max rows"
                defaultValue={runStatus.maxResult}
                onChange={globalUIState.setMaxRowsresult}
                rowsMax="1"
                variant="outlined"
            />
            {runStatus.sqlReturn.querySql.length > 0 ? (
                <>
                    <DataTable
                        title="SQL result"
                        columns={runStatus.sqlReturn.columns}
                        data={runStatus.sqlReturn.querySql}
                        theme="solarized"
                    />
                    {JSON.stringify(runStatus.sqlReturn.querySql[0]) === "{}" ? (
                        <>
                            <Typography variant="subtitle1" className={classes.leftTopMargin16px}>
                                Пусто
                            </Typography>
                        </>
                    ) : (
                        undefined
                    )}
                </>
            ) : runStatus.sqlReturn.process ? (
                <>
                    <br />
                    <CircularProgress className={classes.leftTopMargin16px} />
                </>
            ) : runStatus.sqlReturn.error ? (
                <>
                    <Typography variant="subtitle1" className={classes.leftTopMargin16px}>
                        Error: {runStatus.sqlReturn.error}
                    </Typography>
                </>
            ) : (
                undefined
            )}
        </>
    ));
};

if ((module as any).hot) {
    (module as any).hot.accept();
}
