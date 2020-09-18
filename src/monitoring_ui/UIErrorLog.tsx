import { useObserver } from "mobx-react-lite";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import CircularProgress from "@material-ui/core/CircularProgress";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import { red } from "@material-ui/core/colors";
import ReportProblemRounded from "@material-ui/icons/ReportProblemRounded";
import IconButton from "@material-ui/core/IconButton";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Dialog from "@material-ui/core/Dialog";
import CloseIcon from "@material-ui/icons/Close";
import debugjs from "debug";
import { GlobalUIState, ProjectItem, runStatus, RunStatus } from "./RunStatus";
import { MultiProgressBar, MultiProgressBarItem } from "./MultiProgressBar";
import { stageColors } from "./IssueLoaderColors";
import { sortObjects } from "Ystd";
import { UIProjectStatsRow } from "./UIProjectStatsRow";

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

export const UIErrorLog: React.FC<{ project: string; globalUIState: GlobalUIState; runStatus: RunStatus }> = ({
    project,
    globalUIState,
    runStatus,
}) => {
    debugRender("UIErrorLog");
    // react-native-multicolor-progress-bar
    const classes = useStyles();
    return useObserver(() => {
        return (
            <>
                <IconButton color={"primary"} onClick={(fu) => globalUIState.openErrorLog(project)}>
                    <ReportProblemRounded style={{ color: red[500] }} />
                </IconButton>
                <Dialog
                    open={
                        runStatus.errorLogConfig.openErrorLogValue &&
                        runStatus.errorLogConfig.selectedProject == project
                    }
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle>
                        Отчет по ошибкам проекта {project}
                        <IconButton aria-label="close" onClick={globalUIState.closeErrorLog}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>issuekey</TableCell>
                                    <TableCell>error</TableCell>
                                </TableRow>
                            </TableHead>
                            {runStatus.errorLogConfig.loadedFlag ? (
                                <TableBody>
                                    {Object.values(runStatus.errorLogConfig.loadedErrors).map((item: any) => (
                                        <TableRow>
                                            <TableCell>{item.issueKey}</TableCell>
                                            <TableCell>{item.prevError}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            ) : (
                                <CircularProgress />
                            )}
                        </Table>
                        {"(ограничение - первые 10 ошибок)"}
                    </DialogContent>
                </Dialog>
            </>
        );
    });
};

if ((module as any).hot) {
    (module as any).hot.accept();
}
