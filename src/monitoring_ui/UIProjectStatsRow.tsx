import { useObserver } from "mobx-react-lite";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import { red } from "@material-ui/core/colors";
import ReportProblemRounded from "@material-ui/icons/ReportProblemRounded";
import { UIErrorLog } from "./UIErrorLog";
import debugjs from "debug";
import { GlobalUIState, ProjectItem, RunStatus } from "./RunStatus";
import { MultiProgressBar, MultiProgressBarItem } from "./MultiProgressBar";
import { stageColors } from "./IssueLoaderColors";
import { sortObjects } from "Ystd";

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

export const UIProjectStatsRow: React.FC<{
    projectItem: ProjectItem;
    globalUIState: GlobalUIState;
    runStatus: RunStatus;
}> = ({ projectItem, globalUIState, runStatus }) => {
    debugRender("UIProjectStatsRow");
    // react-native-multicolor-progress-bar
    const classes = useStyles();
    return useObserver(() => {
        const progressBarItems: MultiProgressBarItem[] = [];
        let total = 0;
        for (let k in projectItem)
            if (projectItem.hasOwnProperty(k) && k !== "name") {
                const c = (projectItem as any)[k];
                total += +c;
                progressBarItems.push({
                    name: k,
                    value: +c,
                    color: stageColors[k] || stageColors.unknown,
                });
            }
        sortObjects(progressBarItems, "name");

        // console.log(`DELETE_THIS progressBarItems = `, progressBarItems, JSON.stringify(progressBarItems, undefined, "    "));

        return (
            <TableRow className={classes.table}>
                <TableCell>{projectItem.name}</TableCell>
                {projectItem["99_zerror"] ||
                (runStatus.errorLogConfig.openErrorLogValue &&
                    runStatus.errorLogConfig.selectedProject == projectItem.name) ? (
                    <TableCell>
                        <UIErrorLog project={projectItem.name} globalUIState={globalUIState} runStatus={runStatus} />
                    </TableCell>
                ) : (
                    <TableCell></TableCell>
                )}
                <TableCell>
                    <MultiProgressBar items={progressBarItems} />
                </TableCell>
                <TableCell>{projectItem["99_zerror"]}</TableCell>
                <TableCell>{projectItem["99_yrunning"]}</TableCell>
                <TableCell>{projectItem["99_succeded"]}</TableCell>
                <TableCell>{projectItem["03_db"]}</TableCell>
                <TableCell>{projectItem["02_transform"]}</TableCell>
                <TableCell>{projectItem["01_jira"]}</TableCell>
                <TableCell>{total}</TableCell>
            </TableRow>
        );
    });
};

if ((module as any).hot) {
    (module as any).hot.accept();
}
