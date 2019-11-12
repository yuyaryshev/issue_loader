import { Env } from "./startEnv";
import JiraClient from "jira-connector";
import { Connection } from "oracledb";
import { readDJiraFieldMarkedMeta } from "./dbdJiraField";
import { JiraIssue } from "./types";
import { prepareDbDomain } from "./dbDomain";
import { dbdJiraIssueInput } from "./dbdJiraIssue";

const onJiraIssuesChanges = () => {
    // TODO_NEXT onJiraIssuesChanges
};

const onJiraWorklogChanges = () => {
    // TODO_NEXT onJiraWorklogChanges
};

export const prepareLoadJiraIssues = async (env: Env, db: Connection) => {
    const markedFields = await readDJiraFieldMarkedMeta(db, env.settings.tables.CURRENT_JIRA_FIELD, false);
    const dbdJiraIssue = prepareDbDomain(env.settings, dbdJiraIssueInput(markedFields));


    const insertIssuesSql = `insert into ${env.settings.tables.JIRA_ISSUE_CHANGES}(
  ${markedFields.map(f => f.TARGET_NAME).join(",\n")}
  ) values(${markedFields.map(f => "?").join(",")})`;

    // TODO_NEXT Fix worklog table schema
    const insertWorklogSql = `insert into ${env.settings.tables.JIRA_WORKLOG_CHANGES}(
  TBD
  ) values(TBD)`;

    // TODO_NEXT  - Таблица с jira_pipes с шаблонами JQL, датами изменения и jira_pipe_id
    //         - Сохранение даты в эту таблицу

    // - Функция прогрузки порции изменений jira в базу
    //     - Загружаем дату из этой таблицы jira_pipes
    //     - Засылает JQL по шаблону
    //     - В транзакиции
    //         - onIssueChanged
    //             - ??? Реализация всякой фигни по трансляции полей
    //             - Запись на основе makePreparedIssueInsert
    //         - Сохранение даты в эту таблицу jira_pipes
    //         - Вызываем процедуру handle_jira_issues_changes
    //         - Вызываем процедуру handle_jira_worklog_changes

    const worker = async (issues: JiraIssue[]) => {
        // TODO_NEXT получить issues из Jira
        // TODO_NEXT вызвать onJiraIssues
        // TODO_NEXT load jira.jql - получить только измененные issue, возможно там же - получить worklog или отдельно ниже
        // TODO_NEXT load jira issue links
        // TODO_NEXT load jira.issue.getWorklog(); - получить worklog
        // TODO_NEXT load jira.issue.getChangelog(); - получить change_log
        // TODO_NEXT load jira comments - получить comments

        // TODO_NEXT await db.executeMany(insertIssuesSql);
        // TODO_NEXT await db.executeMany(insertWorklogSql);
        throw new Error(`T8325 - Not implemented`);
    };

    for (let f of markedFields) {
        // let TBD = [f.is_custom, f.id, f.name, f.custom_id, f.java_type, f.type, f.target_name];
    }
};
// TODO_NEXT loadJiraIssues.ts - загрузка issue и worklog из Jira
// - Подготовка к загрузке
//     + Проверяем что current_jira_fields существует, иначе - падаем, требуя провести migration
//     + Считываем поля из current_jira_fields
//     - Функция makePreparedIssueInsert для insert в jira_issues_changes
//     - Функция makePreparedWorklogInsert для insert в jira_worklog_changes
//     - ??? Подготовка всякой фигни для трансляции значений, если такая трансляция нужна - например для полей с выпадающими списками или пользователей
