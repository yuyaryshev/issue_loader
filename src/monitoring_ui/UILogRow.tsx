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
        width: "200px",
    },
});

const allFields = true;

export const UILogRow: React.FC<{ log: any; globalUIState: GlobalUIState }> = ({ log, globalUIState }) => {
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
};

if ((module as any).hot) {
    (module as any).hot.accept();
}
