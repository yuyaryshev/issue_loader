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

export function UILogRow({ log, globalUIState }) {
    debugRender("UILogRow");
    const classes = useStyles();
    return useObserver(() => (
        <TableRow>
            <TableCell>{log.ts}</TableCell>
            <TableCell>{log.cpl}</TableCell>
            <TableCell>{log.severity}</TableCell>
            <TableCell>{log.prefix}</TableCell>
            <TableCell>{log.message}</TableCell>
            <TableCell>{log.data}</TableCell>
        </TableRow>
    ));
}

if (module.hot) {
    module.hot.accept();
}
