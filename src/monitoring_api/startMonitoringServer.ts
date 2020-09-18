import { Env, EnvWithDbdJiraIssue } from "other";
import { yconsole } from "Ystd";
import express from "express";

import { statusApi } from "./statusApi";
import { authorizationApi } from "./authorizationApi";
import { issuesApi } from "./issuesApi";
import { jobsApi } from "./jobsApi";
import { logsApi } from "./logsApi";
import { projectStatsApi } from "./projectStatsApi";
import { errorLogApi } from "./errorLogApi";
import { jobStatsApi } from "./jobStatsApi";
import { jobPauseApi } from "./jobPauseApi";
import { jobResumeApi } from "./jobResumeApi";
import { jobMakeStaleApi } from "./jobMakeStaleApi";
import { runIssuesApi } from "./runIssuesApi";
import { SQLApi } from "./SQLApi";
import { shutdownApi } from "./shutdownApi";
import { graphChartApi } from "./graphChartApi";
import { importApi, exportApi } from "./importExportApi";

export function startMonitoring(env: EnvWithDbdJiraIssue, port: number | undefined) {
    if (!port) {
        console.log(
            `CODE00000183`,
            `No monitoring port specified. /runStatus and /api/runStatus monitor endpoint is disabled in settings file.`
        );
        yconsole.log(
            `CODE00000225`,
            `No monitoring port specified. /runStatus and /api/runStatus monitor endpoint is disabled in settings file.`
        );
        return;
    }

    const app = express();
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    app.get("/api/status", (req, res) => statusApi(env, req, res));
    app.get("/api/authorization", (req, res) => authorizationApi(env, req, res));

    app.get("/api/issues", (req, res) => issuesApi(env, req, res));
    app.get("/api/jobs", (req, res) => jobsApi(env, req, res));
    app.get("/api/logs", (req, res) => logsApi(env, req, res));
    app.get("/api/projectStats", (req, res) => projectStatsApi(env, req, res));
    app.get("/api/errorLogApi", (req, res) => errorLogApi(env, req, res));
    app.get("/api/jobstats", (req, res) => jobStatsApi(env, req, res));
    app.get("/api/jobPause", (req, res) => jobPauseApi(env, req, res));
    app.get("/api/jobResume", (req, res) => jobResumeApi(env, req, res));
    app.get("/api/jobMakeStale", (req, res) => jobMakeStaleApi(env, req, res));
    app.get("/api/runIssuesApi", (req, res) => runIssuesApi(env, req, res));
    app.get("/api/sqlapi", (req, res) => SQLApi(env, req, res));
    app.get("/api/shutdown", (req, res) => shutdownApi(env, req, res));
    app.get("/api/graphChart", (req, res) => graphChartApi(env, req, res));
    app.get("/api/export", (req, res) => exportApi(env, req, res));
    app.get("/api/import", (req, res) => importApi(env, req, res));

    app.enable("trust proxy");

    app.use(express.static("public"));
    const httpServerInstance = app.listen(port, () => {
        console.log(`CODE00000282`, `Started /runStatus and /api/runStatus monitor endpoint on port ${port}...`);
        yconsole.log(`CODE00000283`, `Started /runStatus and /api/runStatus monitor endpoint on port ${port}...`);
    });

    env.onTerminateCallbacks.push(() => {
        httpServerInstance.close();
    });
}
