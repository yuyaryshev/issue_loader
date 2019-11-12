import { startEnv, OracleConnection, Env, loadDbdIssueFields } from "./startEnv";
import { setLsPartStatus, setLsStatus, LoadStreams, LoadStream, decoderLoadStream } from "./dbdLoadStream";
import { yconsole, debugMsgFactory } from "./consoleMsg";
import { KVCacheSet } from "./kvCache";
import { awaitDelay } from "./awaitDelay";
import moment from "moment";
import { writeJiraIssuesToDb, writeDbFinalize } from "./dbdJiraIssue";
import { writeFileSyncIfChanged } from "./writeFileSyncIfChanged";
import express from "express";
import { IssueStreamRunStatus, newIssueStreamRunStatus } from "./dbdLoadStream";
import { JiraIssues } from "./JiraWrapper";

const debug = debugMsgFactory("run");
const debugSql = debugMsgFactory("sql");
const debugStreams = debugMsgFactory("run.streams");
const debugIssues = debugMsgFactory("run.issues");
const debugWorkCycle = debugMsgFactory("run.workCycle");

export interface IssueStreamRunStatuses {
    [key: string]: IssueStreamRunStatus;
}
export interface RunStatus {
    lastRun: string;
    streams: IssueStreamRunStatuses;
    jiraTime: string;
    knownErrors: string[];
}

let prevDay = moment().format("YYYY-MM-DD");
let prev10mins = moment().format("YYYY-MM-DD hh:dd");

let runStatus: RunStatus = {
    lastRun: "",
    jiraTime: "",
    streams: {},
    knownErrors: []
};

async function refreshJiraTime(env: Env) {
    debugIssues(`T7151`, `Requesting Jira server time -1 min...`);
    const serverInfo = await env.jira.getServerInfo();
    const jiraServerTimeMoment = moment(serverInfo.serverTime);
    const jiraServerTime = jiraServerTimeMoment.subtract(1, "minutes");
    let newLAST_UPDATED_TS = jiraServerTime.format();
    debugIssues(`T7152`, `Requesting Jira server time -1 min = '${newLAST_UPDATED_TS}' - OK`);
    runStatus.jiraTime = newLAST_UPDATED_TS;
    return newLAST_UPDATED_TS;
}

export interface PrefetchItem {
    name: string;
    f: () => Promise<void>;
    finished: boolean;
    promise?: Promise<void>;
}

export const run = async function(program: any) {
    const env0 = await startEnv("run");
    yconsole.log(`T4101`, `Starting 'run'...`);

    const port = env0.settings.monitorEndpointPort;
    if (port) {
        const app = express();

        app.use(function(req, res, next) {
            res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });

        app.get("/api/runStatus", (req, res) => res.send(JSON.stringify(runStatus)));
        app.use(express.static("public"));
        app.listen(port, () => {
            yconsole.log(`T4171`, `Started /runStatus and /api/runStatus monitor endpoint on port ${port}...`);
        });
    } else yconsole.log(`T4172`, `/runStatus and /api/runStatus monitor endpoint is disabled in settings file.`);

    const env = await loadDbdIssueFields(env0);

    let done = false;
    let loadStreams: LoadStreams = {};
    const sqlLoadStreams = `select * from ${env.settings.tables.LOAD_STREAM}`;

    async function refreshLoadStreams() {
        if (done) return;

        debugStreams(`T6001`, `Started`);
        try {
            await env.dbProvider(async function(db: OracleConnection) {
                debugSql(`T6002`, `Reading load streams from Oracle '${sqlLoadStreams}'`);
                const response = await db.execute(sqlLoadStreams);
                if (!response.rows) {
                    yconsole.fatal(
                        `T9201`,
                        `${sqlLoadStreams} returned incorrect result:'${JSON.stringify(response)}'`
                    );
                    process.exit(1);
                    return;
                }

                if (!response.rows) {
                    yconsole.fatal(`T9202`, `${sqlLoadStreams} returned no rows - nothing to do - exiting`);
                    process.exit(0);
                    return;
                }

                debugStreams(`T6003`, `parsing results`);
                const newLoadStreams = {} as LoadStreams;

                for (let r of response.rows as any) {
                    for (let k in r) if (r[k] === null) r[k] = undefined;
                    r.ENABLED = r.ENABLED === "Y";
                    r.idle = true;
                    decoderLoadStream.runWithException(r);
                    newLoadStreams[r.ID] = r;
                }

                for (let k in newLoadStreams) {
                    if (!runStatus.streams[k]) runStatus.streams[k] = newIssueStreamRunStatus(k);
                    newLoadStreams[k].status = runStatus.streams[k];
                }

                for (let k in runStatus.streams) {
                    if (!newLoadStreams[k]) delete runStatus.streams[k];
                    else if (!newLoadStreams[k].ENABLED) {
                        runStatus.streams[k].status = "LS90 Disabled";
                        runStatus.streams[k].errors = ["Отключен"];
                        runStatus.streams[k].lastRunOk = false;
                    }
                }

                loadStreams = newLoadStreams;
                debugStreams(`T6004`, `Finished - OK`);

                if (done) return;
            });
        } catch (e) {
            debugStreams(`T6006`, `failed - fail`, e, ` will retry later`);
        }
    }

    async function saveJiraIssuesToCache(env: Env, issues: any[]) {
        if (env.settings.issuesCache.enabled) {
            for (let issue of issues) KVCacheSet(env.issuesCache, issue.key, issue);
        }
    }

    function makeJql(ls: LoadStream) {
        const jqlParts = [] as string[];
        jqlParts.push(`(${ls.CONDITION})`);
        if (ls.LAST_UPDATED_TS) jqlParts.push(`updated > '${moment(ls.LAST_UPDATED_TS).format("YYYY-MM-DD HH:mm")}'`);

        return jqlParts.join(" and ");
    }

    async function loadJiraIssuesStream(ls: LoadStream, newLAST_UPDATED_TS: string) {
        const jql = makeJql(ls);
        setLsStatus(ls, "LS01 Init", jql);
        let total: number = 0;
        ls.status.lastCount = 0;
        ls.status.lastTotal = 0;

        setLsStatus(ls, "LS02 Parallelize", jql);
        await env.jira.search({ jql, maxResults: 1000, expand: ["changelogs", "worklogs"] }, async function(
            index: number,
            startAt: number,
            responsePromise: Promise<JiraIssues>
        ) {
            setLsPartStatus(ls, index, "LS03 Jira");
            const response = await responsePromise;
            total = response.total;
            ls.status.lastTotal = response.total;

            if (response.issues) {
                setLsPartStatus(ls, index, "LS04 Cache");
                await saveJiraIssuesToCache(env, response.issues);

                setLsPartStatus(ls, index, "LS05 DB");
                await writeJiraIssuesToDb(env, response.issues);
                ls.status.lastCount += response.issues.length;
            }

            setLsPartStatus(ls, index, "LS06 Done");
        });

        if (total) {
            setLsStatus(ls, "LS07 DB Final");
            await writeDbFinalize(env, ls.ID, newLAST_UPDATED_TS);
            ls.status.count10min += total;
            ls.status.countToday += total;
        }

        ls.status.lastRun = moment().format();
        ls.LAST_UPDATED_TS = newLAST_UPDATED_TS;
        setLsStatus(ls, "");
        return total || 0;
    }

    async function loadJiraIssues() {
        debugIssues(`T7001`, `Started`);
        if (done) return;
        try {
            let newAskedForJiraTime = moment()
                .format("YYYY-MM-DD hh:mm:ss")
                .substr(0, 18);
            let lastAskedForJiraTime = newAskedForJiraTime;

            let fixedJiraTime = await refreshJiraTime(env);

            const currentLoadStreams = Object.values(loadStreams).filter(ls => ls.ENABLED && ls.CONDITION);

            let promises: Promise<any>[] = [];
            for (let ls of currentLoadStreams)
                if (!env.settings.dbgStream || env.settings.dbgStream === ls.ID)
                    promises.push(
                        (async function() {
                            let lastRunOk = false;
                            let errors: string[] = [];
                            try {
                                let newAskedForJiraTime = moment()
                                    .format("YYYY-MM-DD hh:mm:ss")
                                    .substr(0, 18);
                                if (newAskedForJiraTime !== lastAskedForJiraTime) {
                                    fixedJiraTime = await refreshJiraTime(env);
                                    lastAskedForJiraTime = newAskedForJiraTime;
                                }
                                await loadJiraIssuesStream(ls, fixedJiraTime);
                                lastRunOk = true;
                            } catch (e) {
                                if (typeof e === "string") {
                                    const parsed = JSON.parse(e);
                                    if (parsed.body && parsed.body.errorMessages) {
                                        errors = parsed.body.errorMessages;
                                        const errorStr = errors.join("\n");
                                        if (!runStatus.knownErrors.includes(errorStr)) {
                                            runStatus.knownErrors.push(errorStr);
                                            writeFileSyncIfChanged(
                                                "./errors.json",
                                                JSON.stringify([...runStatus.knownErrors], undefined, "    ")
                                            );
                                        }
                                    }

                                    debugIssues(
                                        `T7009`,
                                        `Finished stream='${ls.ID}' - failed`,
                                        JSON.stringify(parsed, undefined, "    ")
                                    );
                                } else debugIssues(`T7010`, `Finished stream='${ls.ID}' - failed`, e);
                            }
                        })()
                    );
            await Promise.all(promises);
        } catch (e) {
            if (typeof e === "string")
                debugIssues(`T7349`, `Finished - failed`, JSON.stringify(JSON.parse(e), undefined, "    "));
            else debugIssues(`T7010`, `Finished - failed`, e);
        }
        if (done) return;
    }

    async function workCycle() {
        debugWorkCycle(`T5001`, `Starting`);
        let thisDay = moment().format("YYYY-MM-DD");
        if (prevDay !== thisDay) {
            debugWorkCycle(`T5011`, `Flushing day counters`);
            prevDay = thisDay;
            for (let k in runStatus.streams) {
                runStatus.streams[k].countToday = 0;
                runStatus.streams[k].count10min = 0;
            }
        }

        let this10mins =
            moment()
                .format("YYYY-MM-DD hh:mm")
                .substr(0, 15) + "0";
        if (prev10mins !== this10mins) {
            debugWorkCycle(`T5021`, `Flushing 10 min counters`);
            prev10mins = this10mins;
            for (let k in runStatus.streams) runStatus.streams[k].count10min = 0;
        }

        await refreshLoadStreams();
        await loadJiraIssues();
        debugWorkCycle(`T5005`, `Finished - OK`);
        setTimeout(workCycle, env.settings.timeouts.workCycle);
        debugWorkCycle(`T5006`, `Scheduled next run in ${env.settings.timeouts.workCycle} ms`);
    }
    workCycle();

    yconsole.log(`T4191`, `'run' initialization Finished - OK`);
    yconsole.log(`T4192`, `Listening to changes...`);
};
