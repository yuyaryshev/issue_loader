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
import { UIIssueRow } from "./UIIssueRow";
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

export const UIIssues: React.FC<{ issues: any; globalUIState: GlobalUIState }> = ({ issues, globalUIState }) => {
    const classes = useStyles();
    debugRender("UIIssues");
    return useObserver(() => (
        <>
            <TextField
                className={classes.filterTextField}
                label="Filter"
                defaultValue={globalUIState.jobsFilter}
                onChange={globalUIState.setJobsFilter}
            />
            <Table className={classes.table} size="small">
                <TableHead>
                    <TableRow>
                        {/*<TableCell align="right">Ок?</TableCell>
                        <TableCell className={classes.stepColumn}>Шаг</TableCell>*/}

                        <TableCell>Id</TableCell>
                        <TableCell>issueKey</TableCell>
                        <TableCell>Actions</TableCell>
                        <TableCell>paused</TableCell>
                        <TableCell>succeded</TableCell>
                        <TableCell>state</TableCell>

                        {globalUIState.jobDetailsInGrid ? (
                            <>
                                <TableCell>priority</TableCell>
                                <TableCell>cancelled</TableCell>
                                <TableCell>predecessorsDone</TableCell>

                                <TableCell>jobContext</TableCell>

                                <TableCell>retryIntervalIndex</TableCell>
                                <TableCell>timesSaved</TableCell>
                                <TableCell>project</TableCell>
                                <TableCell>updatedTs</TableCell>
                            </>
                        ) : (
                            undefined
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {issues.map((issue: any) => (
                        <UIIssueRow key={issue.id} issue={issue} globalUIState={globalUIState} />
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

/*
jobs
.filter(job => {
                            return (
                                !globalUIState.jobsFilter ||
                                !globalUIState.jobsFilter.trim().length ||
                                job.jsonUpper.includes(globalUIState.jobsFilter.trim().toUpperCase())
                            );
                        })
                        .map(job => (
                            <UIJobRow key={job.id} job={job} globalUIState={globalUIState} />
                        ))

-----------------------
{(function filterJobs(jobs) {
                        let filtred_jobs = [];
                        let maxJobsForClientShown = 20;
                        for (let job of jobs) {
                            if (
                                !globalUIState.jobsFilter ||
                                !globalUIState.jobsFilter.trim().length ||
                                job.jsonUpper.includes(globalUIState.jobsFilter.trim().toUpperCase())
                            ) {
                                filtred_jobs.push(<UIJobRow key={job.id} job={job} globalUIState={globalUIState} />);
                                maxJobsForClientShown--;
                                if (maxJobsForClientShown == 0) break;
                            }
                        }
                        return filtred_jobs;
                    })(jobs)
                    }
 */
