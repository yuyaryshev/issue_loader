import { useObserver } from "mobx-react-lite";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";

import { StatusIcon } from "./StatusIcon";
import Typography from "@material-ui/core/Typography";
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

export const UILoadStreams: React.FC<{ streams: any }> = ({ streams }) => {
    const classes = useStyles();
    debugRender("UILoadStreams");
    return useObserver(() => (
        <>
            <Table className={classes.table} size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Id</TableCell>
                        <TableCell align="right">Ок?</TableCell>
                        <TableCell className={classes.stepColumn}>Шаг</TableCell>
                        <TableCell>Последний запуск</TableCell>
                        <TableCell align="right">Загружено</TableCell>
                        <TableCell align="right">Текущие ошибки</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {streams.map((s: any) => (
                        <TableRow key={s.id}>
                            <TableCell component="th" scope="row">
                                {s.id}
                            </TableCell>
                            <TableCell align="center">
                                <StatusIcon status={s.lastRunOk} />
                            </TableCell>
                            <TableCell>
                                {s.partStatuses.length > 1 ? (
                                    <div>
                                        <b>
                                            {s.status} {s.lastCount} из {s.lastTotal}
                                        </b>
                                        {s.partStatuses.map((a: any, i: number) => (
                                            <li key={i}>{a}</li>
                                        ))}
                                    </div>
                                ) : (
                                    s.status
                                )}
                            </TableCell>
                            <TableCell>{s.lastRun}</TableCell>
                            <TableCell align="right">
                                {s.lastCount} / {s.count10min} / {s.countToday}
                            </TableCell>
                            <TableCell align="right">{s.errors.join("; ")}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Typography variant="caption" className={classes.typographyStylesFooter}>
                Загружено: в последний запуск / за 10 минут / за сегодня
            </Typography>
        </>
    ));
};

// @observer
// export class LoadStreams extends React.PureComponent {
//     constructor(props) {
//         super(props);
//         // this.state = {};
//     }

//     render() {
//         return <div>
//             <p>I'm Component1, and this is my '<b>this.props.children</b>':</p>
//             {this.props.children.map((c) => <p key={c.key}>Child: {c}</p>)}
//         </div>;
//     }
// }

if ((module as any).hot) {
    (module as any).hot.accept();
}
