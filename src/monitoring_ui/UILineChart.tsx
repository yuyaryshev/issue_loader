import React, { PureComponent } from "react";
// @ts-ignore
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

import { useObserver } from "mobx-react-lite";
import { toJS } from "mobx";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import { UIProjectStatsRow } from "./UIProjectStatsRow";
import debugjs from "debug";
import { GlobalUIState, ProjectItem, ProjectStats } from "./RunStatus";
import { ProjectStatsApiResponse } from "../monitoring_api/projectStatsApi.types";
import { objectIterator } from "Ystd";
import moment from "moment";

const debugRender = debugjs("render");

const useStyles = makeStyles({
    table: {
        minWidth: 900,
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
        width: "1000px",
    },
});

export const UILineChart: React.FC<{ data: any; graph: string; globalUIState: GlobalUIState }> = ({
    data,
    graph,
    globalUIState,
}) => {
    return useObserver(() => {
        const classes = useStyles();
        debugRender("UIProjectStats");
        if (graph === "jobs") {
            return (
                <LineChart
                    width={1200}
                    height={200}
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="jiraIssue" stroke="#FF0000" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="jiraComments" stroke="#008000" />
                    <Line type="monotone" dataKey="jiraWorklog" stroke="#0000FF" />
                    <Line type="monotone" dataKey="transformIssue" stroke="#FFFF00" />
                    <Line type="monotone" dataKey="writeIssueToDb" stroke="#000000" />
                </LineChart>
            );
        } else if (graph === "resources") {
            return (
                <LineChart
                    width={1200}
                    height={200}
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="jira" stroke="#FF0000" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="CPU" stroke="#008000" />
                    <Line type="monotone" dataKey="db" stroke="#0000FF" />
                    <Line type="monotone" dataKey="jobsRunning" stroke="#FFFF00" />
                </LineChart>
            );
        } else {
            return (
                <LineChart
                    width={1200}
                    height={200}
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="contextsInMemory" stroke="#FF0000" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="contextsReadyToRun" stroke="#008000" />
                </LineChart>
            );
        }
    });
};

if ((module as any).hot) {
    (module as any).hot.accept();
}
