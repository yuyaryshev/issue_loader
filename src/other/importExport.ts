import { Env } from "./Env";
import better_sqlite3 from "better-sqlite3";
import { Job_jiraComments, Job_jiraIssue, Job_jiraWorklog } from "job";
import { IssueContextInput } from "../job/IssueContext";
import moment from "moment";
import { awaitDelay, yconsole } from "Ystd";

export async function importJiraDataFromSqlite(env: Env, sqliteFilePath: string, overwrite: boolean = false) {
    if (env.importExportMode !== "") return;
    env.importExportMode = "import";

    yconsole.log(`CODE00000280`, `IMPORT initializing import from '${sqliteFilePath}'...`);
    const import_db = better_sqlite3(sqliteFilePath);
    let newStartsLock = env.jobStorage.lockNewStarts({
        cpl: "CODE00000335",
        c: 10000,
        expire: moment().add(4 * 60 * 60 * 1000),
    });
    env.jobStorage.toggleJobLogs(false);
    try {
        const promises: Set<Promise<any>> = new Set();
        console.log(7);
        env.importExportTotal = import_db.prepare(`select count(1) c from data`).all()[0].c;
        const itemsInPercent = Math.floor(env.importExportTotal / 100);
        if (env.importExportTotal) {
            yconsole.log(`CODE00000336`, `IMPORT total = ${env.importExportTotal}...`);
            env.importExportCurrent = 0;
            let parallel = 0;
            for (let r of import_db.prepare(`select ts, issueKey, type, result from data`).iterate()) {
                while (parallel > 10000000 && !env.terminating) await awaitDelay(300);

                if (env.terminating) break;

                const input: IssueContextInput = {
                    project: r.issueKey.split("-")[0],
                    issueKey: r.issueKey,
                    updated: "",
                };
                parallel++;
                promises.add(
                    (async function importJobCaller() {
                        switch (r.type) {
                            case "issue":
                                await Job_jiraIssue.importJob(env.jobStorage, input, r.result, overwrite);
                                break;
                            case "comments":
                                await Job_jiraComments.importJob(env.jobStorage, input, r.result, overwrite);
                                break;
                            case "worklogs":
                                await Job_jiraWorklog.importJob(env.jobStorage, input, r.result, overwrite);
                                break;
                        }
                        env.importExportCurrent++;
                        parallel--;
                        if (!(env.importExportCurrent / itemsInPercent))
                            yconsole.log(
                                `CODE00000337`,
                                `IMPORT Progress ${env.importExportCurrent} / ${env.importExportTotal} - ${Math.round(
                                    (100.0 * env.importExportCurrent) / env.importExportTotal
                                )}% ...`
                            );
                    })()
                );
            }
            for (let p of promises) await p;
        }
    } finally {
        env.importExportMode = "";
        env.jobStorage.unlockNewStarts(newStartsLock);
        env.jobStorage.toggleJobLogs(true);
        yconsole.log(`CODE00000338`, `IMPORT finished...`);
        try {
            import_db.close();
        } catch (e) {
            console.warn(`CODE00000339 Error when closing import_db ${e.message}`);
        }
    }
}

export function exportJiraDataToSqlite(env: Env, sqliteFilePath: string) {
    if (env.importExportMode !== "") return;
    env.importExportMode = "export";

    yconsole.log(`CODE00000340`, `EXPORT initializing export to '${sqliteFilePath}'...`);
    const export_db = better_sqlite3(sqliteFilePath);
    let newStartsLock = env.jobStorage.lockNewStarts({
        cpl: "CODE00000341",
        c: 10000,
        expire: moment().add(4 * 60 * 60 * 1000),
    });

    try {
        env.importExportTotal = env.better_sqlite3_db
            .prepare(
                `
            select count(1) c
            from jobs 
            where jobs.key in ('jiraIssue','jiraComments','jiraWorklog') and jobs.succeded = 1
        `
            )
            .all()[0].c;
        env.importExportCurrent = 0;

        const itemsInPercent = Math.floor(env.importExportTotal / 100);
        const sql = `
            select issueKey, type, result
            from (
            select
                case 
                    when jobs.key='jiraIssue' then 'issue'
                    when jobs.key='jiraComments' then 'comments'
                    when jobs.key='jiraWorklog' then 'worklogs'
                end type,
                issueKey,
                jobResult.result
            from jobs 
            join jobResult
                on jobs.id = jobResult.id and jobs.succeded = 1
            join jobcontexts
                on jobcontexts.id = jobs.jobContextId
            ) a
            where a.type is not null and a.result is not null
        `;
        export_db.exec(`create table if not exists data(ts, issueKey, type, result)`);
        const insertSql = `insert into data(ts, issueKey, type, result) values('${moment().format()}',?,?,?)`;
        export_db.exec(`begin transaction`);
        const insertStmt = export_db.prepare(insertSql);
        for (let r of env.better_sqlite3_db.prepare(sql).iterate()) {
            if (env.terminating) break;

            insertStmt.run(r.issueKey, r.type, r.result);
            env.importExportCurrent++;
            if (!(env.importExportCurrent % 1000)) {
                export_db.exec(`commit`);
                export_db.exec(`begin transaction`);
            }
            if (!(env.importExportCurrent / itemsInPercent))
                yconsole.log(
                    `CODE00000342`,
                    `EXPORT Progress ${env.importExportCurrent} / ${env.importExportTotal} - ${Math.round(
                        (100.0 * env.importExportCurrent) / env.importExportTotal
                    )}% ...`
                );
        }
        export_db.exec(`commit`);

        const dedublicateSql = `
        delete from data 
        where rowid in (
            select a.rowid 
            from data a
            join
                (
                select issueKey, type, max(ts) ts
                from data 
                group by issueKey, type
                having count(1) > 1
                ) b
            on a.issueKey = b.issueKey
            and a.type = b.type
            and a.ts < b.ts
        ) 
        `;

        export_db.exec(dedublicateSql);
    } finally {
        env.importExportMode = "";
        env.jobStorage.unlockNewStarts(newStartsLock);
        yconsole.log(`CODE00000343`, `EXPORT finished...`);
        try {
            export_db.close();
        } catch (e) {
            console.warn(`CODE00000344 Error when closing export_db ${e.message}`);
        }
    }
}
