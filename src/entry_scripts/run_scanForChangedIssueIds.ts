import { Env, EnvWithDbdJiraIssue } from "other";
import { LoadStream, LoadStreams, writeDbFinalize } from "dbDomains";
import { debugMsgFactory, reversePromise } from "Ystd";
import moment from "moment";
import { Job_issue, Job_jiraComments, Job_jiraIssue, Job_jiraWorklog } from "job";
import { Job, singletonJob } from "Yjob";

const debugIssues = debugMsgFactory("run.issues");

export async function issuekeysToJobs(env: EnvWithDbdJiraIssue, issueIds: string[]): Promise<void> {
    // накладываем scale на все джобы беред основным запуском

    // выполняем обновление данных
    const rPromise = reversePromise(issueIds.length, "CODE00000000");
    for (let issueId of issueIds) {
        /*no_await*/
        Job_jiraIssue.run(env.jobStorage, undefined, { issueId }, true, rPromise);

        /*no_await*/
        Job_jiraComments.run(env.jobStorage, undefined, { issueId }, true, rPromise);

        /*no_await*/
        Job_jiraWorklog.run(env.jobStorage, undefined, { issueId }, true, rPromise);

        /*no_await*/
        Job_issue.run(env.jobStorage, undefined, { issueId }, false, rPromise);
    }
    await rPromise.promise;
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

export async function scanForChangedIssueIds(
    env: EnvWithDbdJiraIssue,
    loadStreams: LoadStreams,
    debugModeScan?: boolean
) {
    await singletonJob<EnvWithDbdJiraIssue>(
        env,
        env.jobStorage,
        "CODE00000172",
        "db.LoadStreams.refresh",
        async function(env: EnvWithDbdJiraIssue, job: Job) {
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

            try {
                for (let loadStream of Object.values(loadStreams).filter(ls => ls.ENABLED)) {
                    if (!debugModeScan && loadStream.LAST_UPDATED_TS && recentTs <= moment(loadStream.LAST_UPDATED_TS))
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

                    const issueIds = await env.jira.jqlGetIssueIds(jql);
                    await issuekeysToJobs(env, issueIds);

                    if (issueIds.length || moment().diff(moment(minUpdatedTs), "m") > 5)
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

                        const issueIds = await env.jira.jqlGetIssueIds(jql);
                        await issuekeysToJobs(env, issueIds);

                        await writeDbFinalize(env, loadStream.ID, fixedJiraTime);
                    } catch (e) {
                        debugIssues(`CODE00000170`, `Error issue ids for project '${loadStream.PROJECT}'`, e);
                    }
                }
            }
        }
    );
}
