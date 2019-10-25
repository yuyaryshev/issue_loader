import {jiraGetAllFieldMetas} from "./jiraGetAllFieldMetas";
import JiraClient from 'jira-connector';
import {Connection} from 'oracledb';
import { settings } from "./settings";

// Загружает поля из jira и обновляет их в Oracle в таблице jira_fields
export const loadJiraUsers = async (jira: JiraClient, db: Connection) => {
//  const jiraFieldMetas = Object.values(await jiraGetAllFieldMetas(jira));

  // TODO load loadJiraUsers - not implemented
  throw new Error(`ERROR - loadJiraUsers - not implemented`);

  // await db.executeMany(
  //   `insert into ${settings.tables.jira_fields_changes}(
  //           is_custom,
  //           id,
  //           name,
  //           custom_id,
  //           java_type,
  //           type
  //   ) values(
  //   ?,?,?,?,?,?
  //   )`,
  //   jiraFieldMetas.map(f => ([
  //     f.is_custom,
  //     f.id,
  //     f.name,
  //     f.custom_id,
  //     f.java_type,
  //     f.type
  //   ])));
  //
  // await db.execute(`exec handle_jira_fields_changes()`);
};
