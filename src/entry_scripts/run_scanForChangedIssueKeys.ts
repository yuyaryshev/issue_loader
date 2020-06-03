import { Env, EnvWithDbdJiraIssue, StartMode } from "other";
import { LoadStream, LoadStreams, writeDbFinalize } from "dbDomains";
import { debugMsgFactory, reversePromise } from "Ystd";
import moment from "moment";
import { Job_issue, Job_jiraComments, Job_jiraIssue, Job_jiraWorklog, Job_transformIssue } from "job";
import { singletonJob, StatusReporter } from "Yjob";
import { IssueContextInput } from "../job/IssueContext";
import { RunIssuesRequest } from "../monitoring_api/types";
import { boolean, constant, Decoder, number, object, oneOf, optional, string } from "@mojotech/json-type-validation";

const debugIssues = debugMsgFactory("run.issues");

export type ModeName = "reload" | "from_cache" | "continue";
export const decoderModeName: Decoder<ModeName> = oneOf(
    constant("reload"),
    constant("from_cache"),
    constant("continue")
);

export async function issueKeysToInputs0(env: EnvWithDbdJiraIssue, issueKeys: Set<string> | string[], mode: ModeName) {
    if (Array.isArray(issueKeys)) issueKeys = new Set(issueKeys);

    let rows = env.jobStorage.db
        .prepare(
            `select project, issueKey, updated from ${env.jobStorage.tableName} where issueKey in (${[...issueKeys]
                .map(issueKey => `'${issueKey}'`)
                .join(",")})`
        )
        .all();

    const issueInputs: IssueContextInput[] = [];
    for (let row of rows) {
        issueKeys.delete(row.issueKey);
        issueInputs.push({
            project: row.project,
            issueKey: row.issueKey,
            updated: row.updated,
            mode,
        } as any);
    }

    // Не найденные issueKey запрашиваем из Jira.
    if (mode !== "from_cache" && issueKeys.size) {
        const jql = `issuekey in (${[...issueKeys].join(",")})`;
        issueInputs.push(...(await env.jira.jqlGetIssueKeys(jql)));
    }
    return issueInputs;
}

export async function issueKeysToInputs(env: EnvWithDbdJiraIssue, issueKeys: Set<string> | string[], mode: ModeName) {
    if (Array.isArray(issueKeys)) issueKeys = new Set(issueKeys);

    const issueInputs: IssueContextInput[] = [];
    for (let row of issueKeys) {
        issueInputs.push({
            project: row.split("-")[0],
            issueKey: row,
            updated: undefined,
            mode,
        } as any);
    }

    return issueInputs;
}

export async function issuesToJobs(
    env: EnvWithDbdJiraIssue,
    issueInputs: (IssueContextInput & { mode?: ModeName })[]
): Promise<void> {
    // накладываем scale на все джобы беред основным запуском

    // выполняем обновление данных
    const rPromise = reversePromise(issueInputs.length * 5, "CODE00000149");

    let startLock =
        issueInputs.length > env.settings.maxIssuesToStopLoading || 100
            ? {
                  cpl: "CODE00000272",
                  c: 1,
                  expire: moment().add(5 * 60 * 1000),
              }
            : undefined;
    if (startLock) env.jobStorage.lockNewStarts(startLock);

    try {
        //выбераем режим устаревания данных
        for (let issueInput0 of issueInputs) {
            let { mode, ...issueInput } = issueInput0;
            if (!mode) mode = "reload";

            // no_await
            Job_jiraIssue.runWait(env.jobStorage, undefined, issueInput, mode === "reload", {}, rPromise);

            // no_await
            Job_jiraComments.runWait(env.jobStorage, undefined, issueInput, mode === "reload", {}, rPromise);

            // no_await
            Job_jiraWorklog.runWait(env.jobStorage, undefined, issueInput, mode === "reload", {}, rPromise);

            // no_await
            Job_transformIssue.runWait(
                env.jobStorage,
                undefined,
                issueInput,
                mode === "reload" || mode === "from_cache",
                {},
                rPromise
            );

            // no_await
            Job_issue.runWait(
                env.jobStorage,
                undefined,
                issueInput,
                mode === "reload" || mode === "from_cache",
                {},
                rPromise
            );
        }
        await rPromise.promise;
    } finally {
        if (startLock) env.jobStorage.unlockNewStarts(startLock);
    }
}

async function refreshJiraTime(env: Env) {
    debugIssues(`CODE00000165`, `Requesting Jira server time -3 seconds...`);
    const serverInfo = await env.jira.getServerInfo();
    const jiraServerTimeMoment = moment(serverInfo.serverTime);
    const jiraServerTime = jiraServerTimeMoment.subtract(3, "seconds");
    let newLAST_UPDATED_TS = jiraServerTime.format();
    debugIssues(`CODE00000166`, `Requesting Jira server time -3 seconds = '${newLAST_UPDATED_TS}' - OK`);
    // TODO runStatus.jiraTime // runStatus.jiraTime = moment(serverInfo.serverTime).format();
    return newLAST_UPDATED_TS;
}

export interface ScanForChangedIssueKeysOpts {
    dbgReloadProjects: string[];
}

export async function scanForChangedIssueKeys(
    env: EnvWithDbdJiraIssue,
    loadStreams: LoadStreams,
    opts?: ScanForChangedIssueKeysOpts
) {
    await singletonJob<EnvWithDbdJiraIssue>(
        env,
        "CODE00000172",
        "db.LoadStreams.refresh",
        async function LoadStreams_refresh(statusReporter: StatusReporter) {
            debugIssues(`CODE00000167`, `Started`);

            if (env.terminating) return;
            const recentLoadStreams: LoadStream[] = [];
            const longLoadStreams: LoadStream[] = [];

            // const  newAskedForJiraTime = moment()
            // .format("YYYY-MM-DD HH:mm:ss")
            // .substr(0, 18);
            // const lastAskedForJiraTime = newAskedForJiraTime;

            const fixedJiraTime = await refreshJiraTime(env);
            const recentTs = moment().subtract(20, "days"); // TODO into settings.json

            if (opts?.dbgReloadProjects?.length) {
                for (let PROJECT of opts.dbgReloadProjects) {
                    longLoadStreams.push({
                        CONDITION: `Project = ${PROJECT}`,
                        ENABLED: true,
                        ID: PROJECT,
                        LAST_UPDATED_TS: undefined,
                        PROJECT,
                        TYPE: "jira",
                    });
                }
            } else
                try {
                    for (let loadStream of Object.values(loadStreams).filter(ls => ls.ENABLED)) {
                        if (loadStream.LAST_UPDATED_TS && recentTs <= moment(loadStream.LAST_UPDATED_TS))
                            recentLoadStreams.push(loadStream);
                        else longLoadStreams.push(loadStream);
                    }
                } catch (e) {
                    debugIssues(`CODE00000168`, `loadJiraIssuesIncrement failed on initialization step`, e);
                }

            if (recentLoadStreams.length) {
                try {
                    let minUpdatedTs = recentLoadStreams[0].LAST_UPDATED_TS!;
                    for (let loadStream of recentLoadStreams)
                        if (minUpdatedTs > loadStream.LAST_UPDATED_TS!) minUpdatedTs = loadStream.LAST_UPDATED_TS!;
                    const jql = `project in (${recentLoadStreams
                        .map(loadStream => loadStream.PROJECT)
                        .join(",")}) and updated >= "${moment(minUpdatedTs).format("YYYY-MM-DD HH:mm")}"`;

                    const issueContextInputs = await env.jira.jqlGetIssueKeys(jql);
                    await issuesToJobs(env, issueContextInputs);

                    if (issueContextInputs.length || moment().diff(moment(minUpdatedTs), "m") > 5)
                        for (let loadStream of recentLoadStreams)
                            await writeDbFinalize(env, loadStream.ID, fixedJiraTime);
                } catch (e) {
                    debugIssues(`CODE00000169`, `Error loading changed issue ids`, e);
                }
            }

            if (longLoadStreams.length) {
                for (let loadStream of longLoadStreams) {
                    try {
                        let jql = `project = ${loadStream.PROJECT}`;
                        if (loadStream.LAST_UPDATED_TS)
                            jql += ` and updated >= "${moment(loadStream.LAST_UPDATED_TS).format("YYYY-MM-DD HH:mm")}"`;

                        const issueContextInputs = await env.jira.jqlGetIssueKeys(jql);
                        await issuesToJobs(env, issueContextInputs);

                        await writeDbFinalize(env, loadStream.ID, fixedJiraTime);
                    } catch (e) {
                        debugIssues(`CODE00000170`, `Error issue ids for project '${loadStream.PROJECT}'`, e);
                    }
                }
            }
        }
    );
}
