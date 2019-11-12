import { jiraGetAllFieldMetas } from "./dbdJiraField";
import { Connection } from "oracledb";
import { Env } from "./startEnv";
import { yconsole } from "./consoleMsg";

// Загружает поля из jira и обновляет их в Oracle в таблице jira_fields
export const loadJiraFields = async function (env: Env, db: Connection) {
    const jiraFieldMetas = Object.values(await jiraGetAllFieldMetas(env));

    // TODO_NEXT load jira.customFieldOption; - получить опции полей
    await env.dbdDJiraField.insertMany(db, jiraFieldMetas);
    await env.dbdDJiraField.executeMerge!(db);
    await db.commit();

    yconsole.log(`T9923`, `loadJiraFields - finished`);
};
