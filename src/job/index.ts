import { AllJobContextTypesBase, AllJobTypesBase } from "Yjob";
import { Job_jiraComments, Job_jiraIssue, Job_jiraWorklog } from "./Job_jiraIssue";
import { Job_transformIssue } from "./Job_transformIssue";
import { Job_issue } from "./Job_issue";
import { issueContext } from "./IssueContext";

export const allJobContextTypes: AllJobContextTypesBase = {
    issue: issueContext,
};

export const allJobTypes: AllJobTypesBase = {
    issue: Job_issue,
    jiraIssue: Job_jiraIssue,
    jiraWorklog: Job_jiraWorklog,
    jiraComments: Job_jiraComments,
    transformIssue: Job_transformIssue,
    writeIssueToDb: Job_issue,
};

export * from "./Job_issue";
export * from "./Job_jiraIssue";
export * from "./Job_transformIssue";
