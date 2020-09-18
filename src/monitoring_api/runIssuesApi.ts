import { EnvWithDbdJiraIssue } from "other";
import { Request, Response } from "express";
import { debugMsgFactory as debugjs, yconsole } from "Ystd";
import { issueKeysToInputs, issuesToJobs } from "../entry_scripts/run_scanForChangedIssueKeys";
import { OracleConnection0 } from "Yoracle";
import { Job } from "Yjob/Job";
import { awaitDelay } from "Yjob/awaitDelay";
import moment from "moment";
import { decoderRunIssuesRequest, RunIssuesRequest } from "./types";

const debug = debugjs("jobPause");

function parseList(s: string): Set<string> {
    return new Set(
        s
            .split(/[\n\t\r, ]+/g)
            .map((s) => s.trim().toUpperCase())
            .filter((s) => s.length)
    );
}

// http://a123278.moscow.alfaintra.net:29364/api/runIssuesApi
export const runIssuesApi = async (env: EnvWithDbdJiraIssue, req: Request, res: Response) => {
    let ok: boolean = false;
    let error: string | undefined;
    try {
        if (req.query?.pass != env.password) {
            return res.send(JSON.stringify({ ok: false, error: "Incorrect password!" }));
        }
        (req.query.allProjects as any) = req.query.allProjects === "true";
        const query = decoderRunIssuesRequest.runWithException(req.query);
        const { mode } = query;

        let ip;
        try {
            ip = req.header("x-forwarded-for") || req.connection.remoteAddress;
        } catch (e) {}

        yconsole.log(
            "CODE00000268",
            `USER:(${ip}) Starting some actions (type: ${query.objType}, mode: ${query.mode})`
        );

        if (query.objType == "issues") {
            if (query.objectsForStart && query.objectsForStart.length > 0 && mode) {
                let issuesKeys = parseList(query.objectsForStart);
                if (issuesKeys.size == 0) {
                    error = "Список пуст - не задано ни одного issue для перезагрузки!";
                    return res.send(JSON.stringify({ ok, error }));
                }
                const issueInputs = await issueKeysToInputs(env, issuesKeys, mode);
                yconsole.log(
                    "CODE00000155",
                    `USER:(${ip}) Starting reload (${mode}) of issues: ${[...issuesKeys].join(",")}`
                );
                await issuesToJobs(env, issueInputs);
                ok = true;
            } else {
                error =
                    "корректно заполните параметры (выберете режим и задайте некоторое количество issue для запуска)";
            }
        } else if (query.objType == "projects") {
            if (mode) {
                let projectKeys: Set<string> = new Set<string>();
                if (query.allProjects) {
                    await env.dbProvider(async function (db: OracleConnection0) {
                        const r = await db.execute(
                            `select PROJECT from ${env.settings.tables.LOAD_STREAM_T} where enabled='Y'`,
                            []
                        );
                        if (r.rows) for (let row of r.rows as any) projectKeys.add(row.PROJECT);
                    });
                } else {
                    let projectKeys0 = parseList(query.objectsForStart);
                    if (projectKeys0.size == 0) {
                        error = "Список пуст - не задано ни одного проекта для перезагрузки!";
                        return res.send(JSON.stringify({ ok, error }));
                    }

                    await env.dbProvider(async function (db: OracleConnection0) {
                        const r = await db.execute(
                            `select PROJECT from ${env.settings.tables.LOAD_STREAM_T} where PROJECT in (${[
                                ...projectKeys0,
                            ]
                                .map((s) => `'${s}'`)
                                .join(",")}) and enabled='Y'`,
                            []
                        );
                        if (r.rows) for (let row of r.rows as any) projectKeys.add(row.PROJECT);
                    });

                    const missingProjects = [...projectKeys0].filter((p) => !projectKeys.has(p));
                    if (missingProjects.length) {
                        error = `Проекты ${missingProjects.join(",")} отсутствуют или отключены в LOAD_STREAM_T`;
                        return res.send(JSON.stringify({ ok, error }));
                    }
                }

                //////
                yconsole.log("CODE00000269", `USER:(${ip}) Trying to start project: ${[...projectKeys].join(",")}`);
                if (mode === "continue" || mode === "reload") {
                    const projectkeysA = [...projectKeys];
                    console.log(projectkeysA.join(","));

                    // получаем все айдишники по всем проектам
                    if (projectkeysA.length > 0) {
                        yconsole.log(
                            "CODE00000224",
                            `RELOAD 1 Starting reload (${mode}) of projects: ${[...projectKeys].join(",")}`
                        );

                        const startLock = env.jobStorage.lockNewStarts({
                            cpl: "CODE00000325",
                            c: 10000,
                            expire: moment().add(15 * 60 * 1000),
                        });
                        /*no_await*/
                        (async function reloadProjects1() {
                            try {
                                while (env.jobStorage.runningJobsCount()) await awaitDelay(100);
                                try {
                                    yconsole.log(
                                        "CODE00000200",
                                        `RELOAD 2 Starting reload (${mode}) of projects: ${[...projectKeys].join(",")}`
                                    );
                                    const jql = `project in (${projectkeysA.join(",")})`;
                                    const issues = await env.jira.jqlGetIssueKeys(jql);
                                    yconsole.log(
                                        "CODE00000261",
                                        `RELOAD 3 Loaded issuekeys (count = ${
                                            issues.length
                                        }) for reload (${mode}) of projects: ${[...projectKeys].join(",")}`
                                    );
                                    for (let issue of issues) (issue as any).mode = mode;
                                    await issuesToJobs(env, issues);
                                } catch (e) {
                                    yconsole.log(
                                        "CODE00000262",
                                        `RELOAD FAILED, for reload (${mode}) of projects: ${[...projectKeys].join(
                                            ","
                                        )}, ${e.message}`
                                    );
                                }
                            } finally {
                                env.jobStorage.unlockNewStarts(startLock);
                            }

                            yconsole.log(
                                "CODE00000263",
                                `RELOAD FINISHED issuesToJobs - finished, for reload (${mode}) of projects: ${[
                                    ...projectKeys,
                                ].join(",")}`
                            );
                        })();
                    }

                    ok = true;
                    return res.send(JSON.stringify({ ok, error }));
                } else if (mode == "from_cache") {
                    env.jobStorage.iterateJobs(undefined, function reloadProjectFromCache(job: Job) {
                        if (!job.running && ["transformIssue", "writeIssueToDb"].includes(job.jobType.type)) {
                            job.succeded = false;
                            job.state = "readyToRun";
                            env.jobStorage.updateJobState(job);
                        }
                    });

                    env.jobStorage.nonSuccededAreFullyLoaded = false;

                    //env.jobStorage.db.exec(`begin transaction`);
                    env.jobStorage.db.exec(`
                    update jobs set succeded=0, state='readyToRun' where key in ('transformIssue','writeIssueToDb') and jobContextId in (select id 
                    from ${env.jobStorage.tableName} where 
                    stage!='01_jira' and
                    project in (${[...projectKeys].map((s) => `'${s}'`).join(",")}))`);
                    env.jobStorage.db.exec(`
                    update ${env.jobStorage.tableName} set succeded=0, stage='02_transform', state='readyToRun'
                    where project in (${[...projectKeys].map((s) => `'${s}'`).join(",")}) and stage!='01_jira'`);
                    //env.jobStorage.db.exec(`commit`);
                }
                //////

                ok = true;
                yconsole.log("CODE00000270", `Starting reload (${mode})  of projects: ${[...projectKeys].join(",")}`);
            }
        } else {
            error = "некорректный запрос (необходим тип загружаемого объекта)";
        }
    } catch (e) {
        error = e.message;
        yconsole.log("CODE00000116", `Error running issues (${e.message})`);
    }
    return res.send(JSON.stringify({ ok, error }));
};
