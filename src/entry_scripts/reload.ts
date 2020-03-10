import { EnvWithDbdJiraIssue, loadDbdIssueFields, startEnv } from "../other/Env";
import { yconsole } from "Ystd";
import { JobTypesEnum } from "Yjob";

// TODO Нужно удалить эту функцию и добавить флаг --reload в run. Этот флаг должен делать то же самое что и однократное нажатие Reload в UI мониторинга

export async function reloadIssuesFromCache(env: EnvWithDbdJiraIssue, projects?: string[]): Promise<number> {
    console.log("out pls");
    let projectsSet = new Set(projects || []);
    let total = 0;
    yconsole.log(`CODE00000178`, `Reloading from cache...`);

    for (let [, job] of env.jobStorage.jobsById) {
        if (job.jobType.type == JobTypesEnum.jiraIssue) {
            console.log("WE GOT|" + job.key);
        }
    }

    /*
    for(let [,job] of env.jobStorage.jobsStatus) {
        if(job.jobType == JobTypesEnum.jiraIssue){
            console.log("WE GOTs|"+job.key);
        }
    }

     */

    /*
    reload stale on:
      Job_jiraIssue
      Job_jiraWorklog
      Job_jiraComments

     */

    console.log("outed");
    /*

    yconsole.log(`CODE00000174`, `Reloading from cache...`);
    if (projects && projects.length) yconsole.log(`CODE00000142`, `Only for projects: ${projects.join(", ")}`);

    throw new Error(`CODE00000205 Нужно переделать эту функцию на основе Sqlite базы, на kvCache она уже не работает`);

     */

    // TODO Нужно переделать эту функцию на основе базы, на Sqlite базы она уже не работает
    // await KVCacheGetAll<JiraIssue>(env.issuesCache, async function(kvCacheRecords: KVCacheValue<JiraIssue>[]) {
    //     const issues: JiraIssue[] = kvCacheRecords.map((cacheRecord: KVCacheValue<JiraIssue>) => {
    //         return cacheRecord.v;
    //     });

    //     if (!projectsSet.size) {
    //         await writeJiraIssuesToDb(env, issues);
    //         yconsole.log(`CODE00000143`, `Saved ${issues.length} issues from cache to db - OK`);
    //         total += issues.length;
    //     } else {
    //         await writeJiraIssuesToDb(env, issues.filter((issue: any) => projectsSet.has(issue.key.split("-")[0])));
    //         yconsole.log(`CODE00000144`, `Saved ${issues.length} issues from cache to db - OK`);
    //         total += issues.length;
    //     }
    // });
    //return total;
    return 0; // TODO добавил чтобы убрать ошибку typescript
}

export const runReload = async function(args: any) {
    const projects: string[] = args.projects || []; // TODO_NEXT add options for reloading just some projects
    const env = await loadDbdIssueFields(await startEnv("reload", { args, noJiraTest: true }));
    yconsole.log(`CODE00000145`, `Starting 'reload'...`);
    const total = await reloadIssuesFromCache(env);
    yconsole.log(`CODE00000146`, `Reloading from cache total = ${total} issues finished - OK`);
};
