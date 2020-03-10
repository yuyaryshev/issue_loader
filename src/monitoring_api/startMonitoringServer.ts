import { Env } from "other";
import { yconsole } from "Ystd";
import express from "express";

import { statusApi } from "./statusApi";
import { jobPauseApi } from "./jobPauseApi";
import { jobResumeApi } from "./jobResumeApi";
import { jobMakeStaleApi } from "./jobMakeStaleApi";

export function startMonitoring(env: Env, port: number) {
    const app = express();
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    app.get("/api/status", (req, res) => statusApi(env, req, res));
    app.get("/api/jobPause", (req, res) => jobPauseApi(env, req, res));
    app.get("/api/jobResume", (req, res) => jobResumeApi(env, req, res));
    app.get("/api/jobMakeStale", (req, res) => jobMakeStaleApi(env, req, res));

    app.use(express.static("public"));
    app.listen(port, () => {
        console.log(`CODE00000282`, `Started /runStatus and /api/runStatus monitor endpoint on port ${port}...`);
        yconsole.log(`CODE00000283`, `Started /runStatus and /api/runStatus monitor endpoint on port ${port}...`);
    });
}
