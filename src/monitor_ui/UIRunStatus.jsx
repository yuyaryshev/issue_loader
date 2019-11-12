import React from "react";
import { observable, computed } from "mobx";
import { observer } from "mobx-react";
import { useObserver } from "mobx-react-lite";
import { UILoadStreams } from "./UILoadStreams";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Card from "@material-ui/core/Card";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Container from "@material-ui/core/Container";
import { StatusIcon } from "./StatusIcon";

const useStyles = makeStyles({
    root: {
        background: "#AAAAAA",
        padding: "16px"
        // margin: "16px"
    },
    runStatusStyles: {
        //        width: "34%",
        overflowX: "auto"
        // padding: "16px",
        // margin: "16px"
    },
    streamsStyles: {
        //        width: "66%",
        overflowX: "auto"
        // padding: "16px",
        // margin: "16px"
    },
    typographyStyles: {
        margin: "16px"
    },
    typographyStylesFooter: {
        margin: "16px",
        width:"100%",
    }});

export function UIRunStatus({ runStatus }) {
    const classes = useStyles();
    return useObserver(() => (
        <Grid container spacing={2} className={classes.root}>
            <Grid item xm={6}>
                <Paper className={classes.runStatusStyles}>
                    <Typography className={classes.typographyStyles} variant="h4">
                        Статус Issue Loader
                    </Typography>
                    <Table className={classes.table} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Параметр</TableCell>
                                <TableCell>Значение</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell component="th" scope="row">
                                    Подключение к серверу Issue Loader
                                </TableCell>
                                <TableCell>
                                    <StatusIcon status={runStatus.connected} />
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell component="th" scope="row">
                                    Последний запуск
                                </TableCell>
                                <TableCell>{runStatus.lastRun}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell component="th" scope="row">
                                    Время сервера Jira
                                </TableCell>
                                <TableCell>{runStatus.jiraTime}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell component="th" scope="row">
                                    Статус обновлен
                                </TableCell>
                                <TableCell>{runStatus.lastRefresh}</TableCell>
                            </TableRow>                            
                        </TableBody>
                    </Table>
                    
                    <p><Typography className={classes.typographyStylesFooter} variant="caption">
                        Данные на этой странице обновляются автоматически (F5 не требуется).
                    </Typography></p>
                    <p><Typography className={classes.typographyStylesFooter} variant="caption">
                        Эти же данные в формате JSON доступны по адресу /api/runStatus.
                    </Typography></p>


                </Paper>
            </Grid>
            <Grid item xm={6}>
                <Paper className={classes.streamsStyles}>
                    <Typography className={classes.typographyStyles} variant="h4">
                        Потоки загрузки
                    </Typography>
                    <UILoadStreams streams={runStatus.streams} />
                </Paper>
            </Grid>
        </Grid>
    ));
}

if (module.hot) {
    module.hot.accept();
}

//     @observable knownErrors = [];
