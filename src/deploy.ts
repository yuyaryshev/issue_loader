import { startEnv, OracleConnection, Env, loadDbdIssueFields } from "./startEnv";
import { reloadIssuesFromCache } from "./reload";
import { readDJiraFieldMarkedMeta, DJiraFieldMarkedMeta } from "./dbdJiraField";
import { executeIfExists, tableExists, renameTable } from "./oracleFuncs";
import { loadJiraFields } from "./loadJiraFields";
import { yconsole } from "./consoleMsg";
import { dbdJiraIssueInput } from "./dbdJiraIssue";
import { prepareDbDomain } from "./dbDomain";
import deepEqual from "fast-deep-equal";
import { dropAllTables } from "./drop_all";

export const baseDeploy = async function(env: Env, db: OracleConnection) {
    if (!(await tableExists(db, env.settings.tables.JIRA_FIELD))) {
        yconsole.log(`T0201`, `Starting 'baseDeploy' because ${env.settings.tables.JIRA_FIELD} does not exist...`);

        if (!(await tableExists(db, env.settings.tables.LOAD_STREAM))) await env.dbdLoadStream.createTable(db);

        await env.dbdDJiraField.createTable(db);
        if (env.dbdDJiraField.createChangesTable) await env.dbdDJiraField.createChangesTable(db);

        if (env.settings.use_stored_procedures) {
            if (env.dbdDJiraField.createHandleChangesSP) env.dbdDJiraField.createHandleChangesSP(db);
            if (env.dbdLoadStream.createHandleChangesSP) env.dbdLoadStream.createHandleChangesSP(db);
        }
    } else yconsole.log(`T0299`, `Skipping 'baseDeploy' because ${env.settings.tables.JIRA_FIELD} already exists.`);
};

export const deploy = async function() {
    let needsReload = false;
    const env = await startEnv("deploy");
    yconsole.log(`T0101`, `Starting 'deploy'...`);

    await env.dbProvider(async function(db: OracleConnection) {
        await baseDeploy(env, db);
        // TODO_NEXT Заблокировать запуск deploy при работающей загрузке. Проверить это можно путем создания lock таблицы.

        yconsole.log(`T0151`, `Loading fields from jira to db...`);
        await loadJiraFields(env, db);
        yconsole.log(`T0152`, `Loading fields from jira to db fields - OK`);

        let willMigrate = await tableExists(db, env.settings.tables.CURRENT_JIRA_FIELD);

        let migrationSql = "";

        yconsole.log(`T0104`, `Reading new fields meta from ${env.settings.tables.JIRA_FIELD}'...`);
        const newFields = await readDJiraFieldMarkedMeta(db, env.settings.tables.JIRA_FIELD, true);
        yconsole.log(`T0124`, `Reading new fields - OK`);

        if (!willMigrate) {
            if (await tableExists(db, env.settings.tables.JIRA_ISSUE)) {
                yconsole.fatal(
                    `T4001`,
                    `${env.settings.tables.JIRA_ISSUE} table exists, but there is no meta - can't migrate data automatically. Drop it and re-run 'deploy'`
                );
                process.exit(1);
            }

            yconsole.log(
                `T0103`,
                `Skipping issue migration phase since this is the first run (no '${env.settings.tables.CURRENT_JIRA_FIELD}' table found)...`
            );
        } else {
            needsReload = willMigrate;
            if (willMigrate) {
                await executeIfExists(db, `drop table ${env.settings.tables.JIRA_ISSUE}`);
                await executeIfExists(db, `drop table ${env.settings.tables.JIRA_ISSUE_CHANGES}`);
                await executeIfExists(db, `drop table ${env.settings.tables.JIRA_ISSUE_OLD}`);
                await executeIfExists(db, `drop table ${env.settings.tables.CURRENT_JIRA_FIELD}`);
                await db.commit();
                willMigrate = false;
            }

            yconsole.log(`T0102`, `Reading current fields meta from ${env.settings.tables.CURRENT_JIRA_FIELD}'...`);
            const oldFields = await readDJiraFieldMarkedMeta(db, env.settings.tables.CURRENT_JIRA_FIELD, false);
            yconsole.log(`T0122`, `Reading current fields - OK`);

            if (deepEqual(newFields, oldFields)) {
                yconsole.log(`T9002`, `Current fields are same as new field - no 'deploy' needed...`);
                return;
            }

            if (false) {
                // HINT этот код не используется. Ранее я планировал копировать старые инциденты в новую таблицу, но не удалось это реализовать
                // возникла ошибка с переименованием таблиц

                yconsole.log(`T0105`, `Making migration sql...`);
                const newFieldsById = {} as { [key: string]: DJiraFieldMarkedMeta };
                for (let n of newFields) newFieldsById[n.ID] = n;

                yconsole.log(`T0106`, `Making migration sql...`);
                const columnMappings: { s: string; t: string }[] = [];
                for (let o of oldFields)
                    if (newFieldsById[o.ID])
                        columnMappings.push({ s: o.TARGET_NAME, t: newFieldsById[o.ID].TARGET_NAME });

                yconsole.log(`T0107`, `Making migration sql...`);
                migrationSql = `insert into ${env.settings.tables.JIRA_ISSUE}(
                    ${columnMappings.map(m => m.t).join(",\n")}
                ) 
                select 
                    ${columnMappings.map(m => m.s).join(",\n")}
                from ${env.settings.tables.JIRA_ISSUE_OLD}`;
                yconsole.log(`T0108`, `Making migration sql - OK`);

                yconsole.log(
                    `T0109`,
                    `Renaming ${env.settings.tables.JIRA_ISSUE} -> ${env.settings.tables.JIRA_ISSUE_OLD}`
                );

                await(db.execute

                await renameTable(db, env.settings.tables.JIRA_ISSUE, env.settings.tables.JIRA_ISSUE_OLD, false);
                await db.commit();
                yconsole.log(`T0110`, `Renamed - OK`);
            }
        }
        yconsole.log(`T0127`, `Dropping ${env.settings.tables.CURRENT_JIRA_FIELD} if exists`);
        await executeIfExists(db, `drop table ${env.settings.tables.CURRENT_JIRA_FIELD}`);

        yconsole.log(`T0128`, `Coping ${env.settings.tables.JIRA_FIELD} -> ${env.settings.tables.CURRENT_JIRA_FIELD}`);
        await executeIfExists(
            db,
            `create table ${env.settings.tables.CURRENT_JIRA_FIELD} as select * from ${env.settings.tables.JIRA_FIELD}`
        );

        yconsole.log(`T0128`, `Dropping old issue temp tables`);

        await executeIfExists(db, `drop table ${env.settings.tables.JIRA_ISSUE_CHANGES}`);

        yconsole.log(`T0130`, `Creating issue tables`);

        const dbdJiraIssue = prepareDbDomain(env.settings, dbdJiraIssueInput(newFields));

        await dbdJiraIssue.createTable(db);
        if (dbdJiraIssue.createChangesTable) await dbdJiraIssue.createChangesTable(db);
        if (env.settings.use_stored_procedures && dbdJiraIssue.createHandleChangesSP)
            await dbdJiraIssue.createHandleChangesSP(db);
        await db.commit();

        yconsole.log(`T0131`, `Creating issue tables - OK`);

        if (willMigrate) {
            yconsole.log(`T0132`, `Moving rows with migrationSql \n`, migrationSql, `\n\n`);
            await db.execute(migrationSql);
            yconsole.log(`T0133`, `Moving rows with migrationSql (see above) - OK`);
            const chk = (await db.execute(
                `select (select count(1) c from ${env.settings.tables.JIRA_ISSUE_OLD}) O, (select count(1) c from ${env.settings.tables.JIRA_ISSUE}) N from dual`
            ))!.rows![0] as any;
            if (chk.O === chk.N) yconsole.log(`T0134`, `Row count matches - OK`);
            else throw new Error(`T0135 Row count mismatched: O = ${chk.O}, N = ${chk.N} - aborting migration!`);

            yconsole.log(`T0136`, `Dropping old table...`);
            await db.execute(`drop table ${env.settings.tables.JIRA_ISSUE_OLD}`);
            await db.commit();
            yconsole.log(`T0137`, `Dropping old table - OK`);
        }

        yconsole.log(`T9001`, `Deploy finished - OK`);
    });

    if (needsReload) {
        const env2 = await loadDbdIssueFields(env);
        await reloadIssuesFromCache(env2);
    }
};
