import {readFileSync} from 'fs';
import {resolve} from 'path';

export const privateSettings = JSON.parse(readFileSync(resolve("./private.json"), "utf-8"));
export const settings = {
  tables: {
    jira_fields_changes: "jira_fields_changes",
    jira_issues_changes: "jira_issues_changes",
    jira_worklog_changes: "jira_worklog_changes",
    current_jira_fields: "dont_touch_jira_fields",
  }
};