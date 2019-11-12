import { JiraIssue } from "./types";
import { startEnv, EnvWithDbdJiraIssue, loadDbdIssueFields } from "./startEnv";
import { yconsole } from "./consoleMsg";
import { KVCacheGetAll, KVCacheRecord } from "./kvCache";
import { writeJiraIssuesToDb } from "./dbdJiraIssue";

export async function reloadIssuesFromCache(env: EnvWithDbdJiraIssue, projects?: string[]): Promise<number> {
    let projectsSet = new Set(projects || []);
    let total = 0;

    yconsole.log(`T8301`, `Reloading from cache...`);
    if (projects && projects.length) yconsole.log(`T8302`, `Only for projects: ${projects.join(", ")}`);

    await KVCacheGetAll<JiraIssue>(env.issuesCache, async function(kvCacheRecords: KVCacheRecord<JiraIssue>[]) {
        const issues = kvCacheRecords.map((cacheRecord: KVCacheRecord<JiraIssue>) => {
            return cacheRecord.v;
        });

        if (!projectsSet.size) {
            await writeJiraIssuesToDb(env, issues);
            yconsole.log(`T8303`, `Saved ${issues.length} issues from cache to db - OK`);
            total += issues.length;
        } else {
            await writeJiraIssuesToDb(env, issues.filter((issue: any) => projectsSet.has(issue.key.split("-")[0])));
            yconsole.log(`T8304`, `Saved ${issues.length} issues from cache to db - OK`);
            total += issues.length;
        }
    });
    return total;
}

export const runReload = async function(program: any) {
    const projects: string[] = program.projects || []; // TODO_NEXT add options for reloading just some projects
    const env = await loadDbdIssueFields(await startEnv("reload", { noJiraTest: true }));
    yconsole.log(`T8601`, `Starting 'reload'...`);
    const total = await reloadIssuesFromCache(env);
    yconsole.log(`T8305`, `Reloading from cache total = ${total} issues finished - OK`);
};
