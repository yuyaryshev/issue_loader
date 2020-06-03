import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import OkIcon from "@material-ui/icons/CheckCircleOutline";
import WarnIcon from "@material-ui/icons/Warning";
import ErrorIcon from "@material-ui/icons/Warning";
import UnknownIcon from "@material-ui/icons/Help";

const useStyles = makeStyles({
    okIcon: {
        color: "#007700",
    },
    warnIcon: {
        color: "#aa8000",
    },
    errorIcon: {
        color: "#BB0000",
    },
    unknownIcon: {
        color: "#000000",
    },
});

// @ts-ignore
export const StatusIcon: React.FC<{ status: string | boolean }> = ({ status }) => {
    const classes = useStyles();

    switch (status) {
        case true:
        case "ok":
            return <OkIcon className={classes.okIcon} />;

        case "warn":
        case "warning":
            return <WarnIcon className={classes.warnIcon} />;

        case false:
        case "error":
            return <ErrorIcon className={classes.errorIcon} />;
    }
    return <UnknownIcon className={classes.unknownIcon} />;
};

if ((module as any).hot) {
    (module as any).hot.accept();
}
