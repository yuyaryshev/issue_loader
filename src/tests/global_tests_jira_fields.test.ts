import { DJiraFieldMarkedMeta } from "dbDomains";
import { expect } from "chai";

export const utMarkedFields1: DJiraFieldMarkedMeta[] = [
    {
        ID: "lastViewed",
        CUSTOM_ID: undefined,
        NAME: "Last Viewed",
        JAVA_TYPE: undefined,
        TYPE: "datetime",
        TARGET_NAME: "lastViewed",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "string40",
    },
    {
        ID: "aggregatetimeoriginalestimate",
        CUSTOM_ID: undefined,
        NAME: "? Original Estimate",
        JAVA_TYPE: undefined,
        TYPE: "number",
        TARGET_NAME: "aggregatetimeoriginalestimate",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "number",
    },
    {
        ID: "issuetype",
        CUSTOM_ID: undefined,
        NAME: "Issue Type",
        JAVA_TYPE: undefined,
        TYPE: "issuetype",
        TARGET_NAME: "issuetype",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "string100",
    },
    {
        ID: "timeestimate",
        CUSTOM_ID: undefined,
        NAME: "Remaining Estimate",
        JAVA_TYPE: undefined,
        TYPE: "number",
        TARGET_NAME: "timeestimate",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "number",
    },
    {
        ID: "aggregatetimespent",
        CUSTOM_ID: undefined,
        NAME: "? Time Spent",
        JAVA_TYPE: undefined,
        TYPE: "number",
        TARGET_NAME: "aggregatetimespent",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "number",
    },
    {
        ID: "workratio",
        CUSTOM_ID: undefined,
        NAME: "Work Ratio",
        JAVA_TYPE: undefined,
        TYPE: "number",
        TARGET_NAME: "workratio",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "number",
    },
    {
        ID: "assignee",
        CUSTOM_ID: undefined,
        NAME: "Assignee",
        JAVA_TYPE: undefined,
        TYPE: "user",
        TARGET_NAME: "assignee",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "user",
        ISSUE_LOADER_TYPE: "string100",
    },
    {
        ID: "duedate",
        CUSTOM_ID: undefined,
        NAME: "Due Date",
        JAVA_TYPE: undefined,
        TYPE: "date",
        TARGET_NAME: "duedate",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "string40",
    },
    {
        ID: "reporter",
        CUSTOM_ID: undefined,
        NAME: "Reporter",
        JAVA_TYPE: undefined,
        TYPE: "user",
        TARGET_NAME: "reporter",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "user",
        ISSUE_LOADER_TYPE: "string100",
    },
    {
        ID: "archivedby",
        CUSTOM_ID: undefined,
        NAME: "Archiver",
        JAVA_TYPE: undefined,
        TYPE: "user",
        TARGET_NAME: "archivedby",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "user",
        ISSUE_LOADER_TYPE: "string100",
    },
    {
        ID: "updated",
        CUSTOM_ID: undefined,
        NAME: "Updated",
        JAVA_TYPE: undefined,
        TYPE: "datetime",
        TARGET_NAME: "updated",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "string40",
    },
    {
        ID: "timeoriginalestimate",
        CUSTOM_ID: undefined,
        NAME: "Original Estimate",
        JAVA_TYPE: undefined,
        TYPE: "number",
        TARGET_NAME: "timeoriginalestimate",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "number",
    },
    {
        ID: "description",
        CUSTOM_ID: undefined,
        NAME: "Description",
        JAVA_TYPE: undefined,
        TYPE: "string",
        TARGET_NAME: "description",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "string2000",
    },
    {
        ID: "priority",
        CUSTOM_ID: undefined,
        NAME: "Priority",
        JAVA_TYPE: undefined,
        TYPE: "priority",
        TARGET_NAME: "priority",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "string100",
    },
    {
        ID: "issuekey",
        CUSTOM_ID: undefined,
        NAME: "Key",
        JAVA_TYPE: undefined,
        TYPE: "issuekey",
        TARGET_NAME: "issuekey",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "string100",
    },
    {
        ID: "created",
        CUSTOM_ID: undefined,
        NAME: "Created",
        JAVA_TYPE: undefined,
        TYPE: "datetime",
        TARGET_NAME: "created",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "string40",
    },
    {
        ID: "summary",
        CUSTOM_ID: undefined,
        NAME: "Summary",
        JAVA_TYPE: undefined,
        TYPE: "string",
        TARGET_NAME: "summary",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "string2000",
    },
    {
        ID: "environment",
        CUSTOM_ID: undefined,
        NAME: "Environment",
        JAVA_TYPE: undefined,
        TYPE: "string",
        TARGET_NAME: "environment",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "string2000",
    },
    {
        ID: "status",
        CUSTOM_ID: undefined,
        NAME: "Status",
        JAVA_TYPE: undefined,
        TYPE: "status",
        TARGET_NAME: "status",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "status",
        ISSUE_LOADER_TYPE: "string100",
    },
    {
        ID: "archiveddate",
        CUSTOM_ID: undefined,
        NAME: "Archived",
        JAVA_TYPE: undefined,
        TYPE: "datetime",
        TARGET_NAME: "archiveddate",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "string40",
    },
    {
        ID: "aggregatetimeestimate",
        CUSTOM_ID: undefined,
        NAME: "? Remaining Estimate",
        JAVA_TYPE: undefined,
        TYPE: "number",
        TARGET_NAME: "aggregatetimeestimate",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "number",
    },
    {
        ID: "creator",
        CUSTOM_ID: undefined,
        NAME: "Creator",
        JAVA_TYPE: undefined,
        TYPE: "user",
        TARGET_NAME: "creator",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "user",
        ISSUE_LOADER_TYPE: "string100",
    },
    {
        ID: "timespent",
        CUSTOM_ID: undefined,
        NAME: "Time Spent",
        JAVA_TYPE: undefined,
        TYPE: "number",
        TARGET_NAME: "timespent",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "number",
    },
    {
        ID: "project",
        CUSTOM_ID: undefined,
        NAME: "Project",
        JAVA_TYPE: undefined,
        TYPE: "project",
        TARGET_NAME: "project",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "string100",
    },
    {
        ID: "resolutiondate",
        CUSTOM_ID: undefined,
        NAME: "Resolved",
        JAVA_TYPE: undefined,
        TYPE: "datetime",
        TARGET_NAME: "resolutiondate",
        LOAD_FLAG: "Y",
        DELETED_FLAG: "N",
        LOAD_ALG_OVERRIDE: undefined,
        ISSUE_LOADER_TYPE_OVERRIDE: undefined,
        ORACLE_TYPE_OVERRIDE: undefined,
        LOAD: true,
        LOAD_ALG: "primitive",
        ISSUE_LOADER_TYPE: "string40",
    },
];

it(`global_tests_jira_fields.test.ts`, function () {
    expect(1).to.equal(1);
});
