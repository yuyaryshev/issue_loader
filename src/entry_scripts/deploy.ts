import { Env, loadDbdIssueFields, OracleConnection, startEnv } from "../other/Env";
import { reloadIssuesFromCache } from "./reload";
import {
    dbdJiraIssueInput,
    DChangelogItem,
    DCommentItem,
    DJiraField,
    DJiraFieldMarkedMeta,
    DLabel,
    DLinkItem,
    DLinkType,
    DUser,
    DWorklogItem,
    LoadStream,
    prepareDbDomain,
    PreperedDbDomain,
    readDJiraFieldMarkedMeta,
} from "dbDomains";
import { executeIfExists, tableExists } from "../Yoracle";
import { loadJiraFields, loadJiraLinkTypes } from "./loadJiraFields";
import { yconsole } from "Ystd";
import deepEqual from "fast-deep-equal";

export const deploy = async function(args: any) {
    let needsReload = false;
    const env = await startEnv("deploy", { args });
    env.args = args;
    yconsole.log(`CODE00000060`, `Starting 'deploy'...`);

    await env.dbProvider(async function(db: OracleConnection) {
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
            if (!(await d.tableExists(db))) await d.createTable(db);

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
        const newFields = await readDJiraFieldMarkedMeta(db, env.settings.tables.JIRA_FIELD_T, true);
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
            const oldFields = await readDJiraFieldMarkedMeta(db, env.settings.tables.CURRENT_JIRA_FIELD_T, false);
            yconsole.log(`CODE00000068`, `Reading current fields - OK`);

            if (deepEqual(newFields, oldFields)) {
                yconsole.log(`CODE00000069`, `Current fields are same as new field - no 'deploy' needed...`);
                return;
            }

            needsReload = willMigrate;
            if (willMigrate) {
                await executeIfExists(db, `drop table ${env.settings.tables.ISSUE_T}`);
                await executeIfExists(db, `drop table ${env.settings.tables.ISSUE_T_CHANGES}`);
                await executeIfExists(db, `drop table ${env.settings.tables.ISSUE_T_OLD}`);
                await executeIfExists(db, `drop table ${env.settings.tables.CURRENT_JIRA_FIELD_T}`);
                await db.commit();
                willMigrate = false;
            }

            if (false && willMigrate) {
                // HINT этот код не используется. Ранее я планировал копировать старые инциденты в новую таблицу, но не удалось это реализовать
                // возникла ошибка с переименованием таблиц

                if (await tableExists(db, env.settings.tables.ISSUE_T_OLD))
                    throw new Error(
                        `CODE00000070 Can't migrate because ${env.settings.tables.ISSUE_T_OLD} exists. Verify data in it isn't needed and drop it to continue.`
                    );

                yconsole.log(`CODE00000071`, `Making migration sql...`);
                const newFieldsById = {} as { [key: string]: DJiraFieldMarkedMeta };
                for (let n of newFields) newFieldsById[n.ID] = n;

                yconsole.log(`CODE00000072`, `Making migration sql...`);
                const columnMappings: { s: string; t: string }[] = [];
                for (let o of oldFields)
                    if (newFieldsById[o.ID])
                        columnMappings.push({ s: o.TARGET_NAME, t: newFieldsById[o.ID].TARGET_NAME });

                yconsole.log(`CODE00000073`, `Making migration sql...`);
                migrationSql = `insert into ${env.settings.tables.ISSUE_T}(
                    ${columnMappings.map(m => m.t).join(",\n")}
                ) 
                select 
                    ${columnMappings.map(m => m.s).join(",\n")}
                from ${env.settings.tables.ISSUE_T_OLD}`;
                yconsole.log(`CODE00000074`, `Making migration sql - OK`);

                yconsole.log(
                    `CODE00000075`,
                    `Renaming ${env.settings.tables.ISSUE_T} -> ${env.settings.tables.ISSUE_T_OLD}`
                );

                const sql = `create table ${env.settings.tables.ISSUE_T_OLD} as select * from ${env.settings.tables.ISSUE_T}`;
                await db.execute(sql, []);

                const sql2 = `select (select count(1) c from ${env.settings.tables.ISSUE_T_OLD}) - (select count(1) c from ${env.settings.tables.ISSUE_T}) r from dual`;
                let rr = await db.execute(sql2, []);

                // @ts-ignore
                if (!(rr && rr.rows && rr.rows[0] && rr.rows[0].r === 0))
                    throw new Error(
                        `CODE00000076 Can't migrate because copy ${env.settings.tables.ISSUE_T} -> ${env.settings.tables.ISSUE_T_OLD} failed.`
                    );
                await db.commit();
                yconsole.log(`CODE00000077`, `Renamed - OK`);
            }
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

        const dbdJiraIssue = prepareDbDomain(env.settings, dbdJiraIssueInput(newFields));

        await dbdJiraIssue.createTable(db);
        if (dbdJiraIssue.createChangesTable) await dbdJiraIssue.createChangesTable(db);
        if (env.settings.use_stored_procedures && dbdJiraIssue.createHandleChangesSP)
            await dbdJiraIssue.createHandleChangesSP(db);
        await db.commit();

        yconsole.log(`CODE00000082`, `Creating issue tables - OK`);

        if (willMigrate) {
            yconsole.log(`CODE00000083`, `Moving rows with migrationSql \n`, migrationSql, `\n\n`);
            await db.execute(migrationSql);
            yconsole.log(`CODE00000084`, `Moving rows with migrationSql (see above) - OK`);
            const chk = (await db.execute(
                `select (select count(1) c from ${env.settings.tables.ISSUE_T_OLD}) O, (select count(1) c from ${env.settings.tables.ISSUE_T}) N from dual`
            ))!.rows![0] as any;
            if (chk.O === chk.N) yconsole.log(`CODE00000085`, `Row count matches - OK`);
            else throw new Error(`CODE00000086 Row count mismatched: O = ${chk.O}, N = ${chk.N} - aborting migration!`);

            yconsole.log(`CODE00000087`, `Dropping old table...`);
            await db.execute(`drop table ${env.settings.tables.ISSUE_T_OLD}`);
            await db.commit();
            yconsole.log(`CODE00000088`, `Dropping old table - OK`);
        }

        yconsole.log(`CODE00000089`, `Deploy finished - OK`);
    });

    if (needsReload) {
        const env2 = await loadDbdIssueFields(env);
        await reloadIssuesFromCache(env2);
    }
    env.terminate();
};
