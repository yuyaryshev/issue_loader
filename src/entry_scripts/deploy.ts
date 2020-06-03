import { loadDbdIssueFields, startEnv } from "../other/Env";
import { reloadIssuesFromCache } from "./reload";
import {
    dbdJiraIssueInput,
    dbdJiraIssueInputLog,
    DJiraFieldMarkedMeta,
    prepareDbDomain,
    PreperedDbDomain,
    readDJiraFieldMarkedMeta,
} from "dbDomains";
import { executeIfExists, OracleConnection0, tableExists } from "Yoracle";
import { loadJiraFields, loadJiraLinkTypes } from "./loadJiraFields";
import { yconsole } from "Ystd";
import deepEqual from "fast-deep-equal";

export const deploy = async function(args: any) {
    let needsReload = false;
    const env = await startEnv("deploy", { args });
    env.args = args;
    yconsole.log(`CODE00000060`, `Starting 'deploy'...`);

    env.settings.tables.ISSUE_T = env.settings.write_into_log_tables ? "ISSUE_T_LOG" : env.settings.tables.ISSUE_T;
    await env.dbProvider(async function(db: OracleConnection0) {
        const baseDevDropDomains: PreperedDbDomain<any, any>[] = [
            env.dbdDChangelogItem,
            env.dbdDCommentItem,
            env.dbdDLabel,
            env.dbdDLinkItem,
            env.dbdDUser,
            env.dbdDWorklogItem,
            env.dbdDLinkType,
        ];

        const baseDomains = [env.dbdDJiraField, env.dbdLoadStream, ...baseDevDropDomains];

        if (env.args.devredeploy) {
            for (let d of baseDevDropDomains) await d.dropObjects(db);
        }

        // !(await tableExists(db, env.settings.tables.JIRA_FIELD_T))) {
        for (let d of baseDomains) {
            if (!(await d.tableExists(db))) {
                await d.createTable(db);
                if (!env.settings.write_into_log_tables) {
                    await db.execute(`CREATE MATERIALIZED VIEW LOG ON ${d.name} WITH PRIMARY KEY INCLUDING NEW VALUES`);
                }
            }

            if (d.createChangesTable && !(await d.changesTableExists(db))) await d.createChangesTable(db);
            if (env.settings.use_stored_procedures && d.createHandleChangesSP) await d.createHandleChangesSP(db);
        }
        // TODO_NEXT Заблокировать запуск deploy при работающей загрузке. Проверить это можно путем создания lock таблицы.

        yconsole.log(`CODE00000061`, `Loading fields from jira to db...`);
        await loadJiraFields(env, db);

        yconsole.log(`CODE00000147`, `Loading JiraLinkTypes from jira to db...`);
        await loadJiraLinkTypes(env, db);
        yconsole.log(`CODE00000062`, `Loading fields from jira to db fields - OK`);

        let willMigrate = await tableExists(db, env.settings.tables.CURRENT_JIRA_FIELD_T);

        let migrationSql = "";

        yconsole.log(`CODE00000063`, `Reading new fields meta from ${env.settings.tables.JIRA_FIELD_T}'...`);
        const newFields = await readDJiraFieldMarkedMeta(db, env.settings.tables.JIRA_FIELD_T, false);
        let oldFields: any = undefined;
        yconsole.log(`CODE00000064`, `Reading new fields - OK`);

        if (!willMigrate) {
            if (await tableExists(db, env.settings.tables.ISSUE_T)) {
                yconsole.fatal(
                    `CODE00000065`,
                    `${env.settings.tables.ISSUE_T} table exists, but there is no meta - can't migrate data automatically. Drop it and re-run 'deploy'`
                );
                process.exit(1);
            }

            yconsole.log(
                `CODE00000066`,
                `Skipping issue migration phase since this is the first run (no '${env.settings.tables.CURRENT_JIRA_FIELD_T}' table found)...`
            );
        } else {
            yconsole.log(
                `CODE00000067`,
                `Reading current fields meta from ${env.settings.tables.CURRENT_JIRA_FIELD_T}'...`
            );
            oldFields = await readDJiraFieldMarkedMeta(db, env.settings.tables.CURRENT_JIRA_FIELD_T, false);
            yconsole.log(`CODE00000068`, `Reading current fields - OK`);

            if (deepEqual(newFields, oldFields)) {
                yconsole.log(`CODE00000069`, `Current fields are same as new field - no 'deploy' needed...`);
                if (await tableExists(db, env.settings.tables.ISSUE_T)) return;
                else {
                    let dbdJiraIssue = env.settings.write_into_log_tables
                        ? await prepareDbDomain(env.settings, dbdJiraIssueInputLog(newFields))
                        : await prepareDbDomain(env.settings, dbdJiraIssueInput(newFields));
                    await dbdJiraIssue.createTable(db);
                    if (dbdJiraIssue.createChangesTable) await dbdJiraIssue.createChangesTable(db);
                    return;
                }
            }

            needsReload = willMigrate;
            /*
            if (willMigrate) {
                await executeIfExists(db, `drop table ${env.settings.tables.ISSUE_T}`);
                await executeIfExists(db, `drop table ${env.settings.tables.ISSUE_T_CHANGES}`);
                await executeIfExists(db, `drop table ${env.settings.tables.ISSUE_T_OLD}`);
                await executeIfExists(db, `drop table ${env.settings.tables.CURRENT_JIRA_FIELD_T}`);
                await db.commit();
                willMigrate = false;
            }
            */
        }
        yconsole.log(`CODE00000078`, `Dropping ${env.settings.tables.CURRENT_JIRA_FIELD_T} if exists`);
        await executeIfExists(db, `drop table ${env.settings.tables.CURRENT_JIRA_FIELD_T}`);

        yconsole.log(
            `CODE00000079`,
            `Coping ${env.settings.tables.JIRA_FIELD_T} -> ${env.settings.tables.CURRENT_JIRA_FIELD_T}`
        );
        await executeIfExists(
            db,
            `create table ${env.settings.tables.CURRENT_JIRA_FIELD_T} as select * from ${env.settings.tables.JIRA_FIELD_T}`
        );

        yconsole.log(`CODE00000080`, `Dropping old issue temp tables`);

        await executeIfExists(db, `drop table ${env.settings.tables.ISSUE_T_CHANGES}`);

        yconsole.log(`CODE00000081`, `Creating issue tables`);

        const dbdJiraIssue = env.settings.write_into_log_tables
            ? prepareDbDomain(env.settings, dbdJiraIssueInputLog(newFields))
            : prepareDbDomain(env.settings, dbdJiraIssueInput(newFields));

        await executeIfExists(db, `drop table ${env.settings.tables.ISSUE_T}_OLD`);
        //не забываем про старые данные
        await db.execute(`ALTER TABLE ${env.settings.tables.ISSUE_T} RENAME TO ${env.settings.tables.ISSUE_T}_OLD`);

        await dbdJiraIssue.createTable(db);
        if (dbdJiraIssue.createChangesTable) await dbdJiraIssue.createChangesTable(db);
        if (env.settings.use_stored_procedures && dbdJiraIssue.createHandleChangesSP)
            await dbdJiraIssue.createHandleChangesSP(db);
        await db.commit();

        yconsole.log(`CODE00000082`, `Creating issue tables - OK`);

        if (willMigrate) {
            yconsole.log(`CODE00000083`, `Moving rows with migrationSql \n`, migrationSql, `\n\n`);
            let valuesSqlFromOldFields: any = [];
            //добавляем базовые поля
            valuesSqlFromOldFields.push("ID");
            valuesSqlFromOldFields.push("DELETED_FLAG");
            if (env.settings.write_into_log_tables) {
                valuesSqlFromOldFields.push("TS");
            }
            //добавляем остальные
            outer: for (let newF of newFields) {
                for (let oldF of oldFields) {
                    if (newF.ID == oldF.ID) {
                        valuesSqlFromOldFields.push("to_CHAR(" + oldF.TARGET_NAME + ")");
                        continue outer;
                    }
                }
                valuesSqlFromOldFields.push("null");
            }
            migrationSql = `insert into ${env.settings.tables.ISSUE_T}(
                    ID, DELETED_FLAG, ${env.settings.write_into_log_tables ? "TS, " : ""}
                    ${newFields.map(m => m.TARGET_NAME).join(",\n")}
                ) 
                select 
                    ${valuesSqlFromOldFields.join(",\n")}
                from ${env.settings.tables.ISSUE_T}_OLD`;
            yconsole.log(`CODE00000999`, `Trying to migrate - \n ${migrationSql}`);
            await db.execute(migrationSql);
            yconsole.log(`CODE00000084`, `Moving rows with migrationSql (see above) - OK`);
            const chk = (await db.execute(
                `select (select count(1) c from ${env.settings.tables.ISSUE_T}_OLD) O, (select count(1) c from ${env.settings.tables.ISSUE_T}) N from dual`
            ))!.rows![0] as any;
            if (chk.O === chk.N) yconsole.log(`CODE00000085`, `Row count matches - OK`);
            else throw new Error(`CODE00000086 Row count mismatched: O = ${chk.O}, N = ${chk.N} - aborting migration!`);

            yconsole.log(`CODE00000087`, `Dropping old table...`);
            await db.execute(`drop table ${env.settings.tables.ISSUE_T}_OLD`);
            await db.commit();
            yconsole.log(`CODE00000088`, `Dropping old table - OK`);
        }

        yconsole.log(`CODE00000089`, `Deploy finished - OK`);
    });

    if (needsReload) {
        const env2 = await loadDbdIssueFields(env);
        await reloadIssuesFromCache(env2);
    }
    env.terminate(true);
};
