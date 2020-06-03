import { jiraGetAllFieldMetas, jiraGetAllLinkTypeMetas } from "dbDomains";
import { Env } from "../other/Env";
import { yconsole } from "Ystd";
import { OracleConnection0 } from "Yoracle";

// TODO переименовать в какой нибудь CommonLoadTypes, и сделать единой процедурой

// Загружает поля из jira и обновляет их в Oracle в таблице jira_fields
export const loadJiraFields = async function(env: Env, db: OracleConnection0) {
    const jiraFieldMetas = Object.values(await jiraGetAllFieldMetas(env));

    // TODO_NEXT load jira.customFieldOption; - получить опции полей
    await env.dbdDJiraField.insertMany(db, jiraFieldMetas);
    await env.dbdDJiraField.executeMerge!(db);
    await db.commit();

    yconsole.log(`CODE00000203`, `loadJiraFields - finished`);
};

// Загружает типы линков из jira и обновляет их в Oracle в таблице jira_linktypes
export const loadJiraLinkTypes = async function(env: Env, db: OracleConnection0) {
    // получаем массив типов линков
    const jiraLinkTypes = await jiraGetAllLinkTypeMetas(env);
    //await jiraGetAllLinkTypeMetas(env);

    await env.dbdDLinkType.insertMany(db, jiraLinkTypes);
    await env.dbdDLinkType.executeMerge!(db);
    await db.commit();

    yconsole.log(`CODE00000204`, `loadJiraLinkTypes - finished`);
};
