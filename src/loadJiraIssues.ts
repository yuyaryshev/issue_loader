import JiraClient from "jira-connector";
import { Connection } from "oracledb";
import { settings } from "./settings";
import { JiraFieldMarkedMeta } from "./jiraGetAllFieldMetas";
import { JiraIssue } from "./JiraTypes";

const onJiraIssuesChanges = () => {
// TODO onJiraIssuesChanges
};

const onJiraWorklogChanges = () => {
// TODO onJiraWorklogChanges
};

export const prepareLoadJiraIssues = async (jira: JiraClient, db: Connection) => {
  const sql = `SELECT * from ${settings.tables.current_jira_fields} where deleted_flag <> 'Y' and len(target_name) > 0`;
  const result = await db.execute(sql, []);
  if (!result.rows || !result.rows.length)
    throw new Error(`Oracle haven't returned result for "${sql}". If this table does not exist - did you forget to call 'migration'?`);

  const markedFields = result.rows as any[] as JiraFieldMarkedMeta[];
  const insertIssuesSql = `insert into ${settings.tables.jira_issues_changes}(
  ${markedFields.map(f => f.target_name).join(",\n")}
  ) values(${markedFields.map(f => "?").join(",")})`;


  // TODO Fix worklog table schema
  const insertWorklogSql = `insert into ${settings.tables.jira_worklog_changes}(
  TBD
  ) values(TBD)`;

  // TODO  - Таблица с jira_pipes с шаблонами JQL, датами изменения и jira_pipe_id
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

  const worker = async(issues: JiraIssue[])=> {
    // TODO получить issues из Jira
    // TODO вызвать onJiraIssues
    // TODO load jira.jql - получить только измененные issue, возможно там же - получить worklog или отдельно ниже
    // TODO load jira issue links
    // TODO load jira.issue.getWorklog(); - получить worklog
    // TODO load jira.issue.getChangelog(); - получить change_log
    // TODO load jira comments - получить comments

    await db.executeMany(insertIssuesSql, );
    await db.executeMany(insertWorklogSql, );
  };

  for (let f of markedFields) {
    let TBD = [
      f.is_custom,
      f.id,
      f.name,
      f.custom_id,
      f.java_type,
      f.type,
      f.target_name,
      ];
  }

  export const makePreparedIssueInsert = () => {

  };

};
// TODO loadJiraIssues.ts - загрузка issue и worklog из Jira
// - Подготовка к загрузке
//     + Проверяем что current_jira_fields существует, иначе - падаем, требуя провести migration
//     + Считываем поля из current_jira_fields
//     - Функция makePreparedIssueInsert для insert в jira_issues_changes
//     - Функция makePreparedWorklogInsert для insert в jira_worklog_changes
//     - ??? Подготовка всякой фигни для трансляции значений, если такая трансляция нужна - например для полей с выпадающими списками или пользователей


