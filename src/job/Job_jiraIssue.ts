import { Env } from "../other/Env";
import { Job, JobType } from "Yjob";
import { JiraComment, JiraIssue, JiraLinkItem, JiraWorklogItem } from "Yjira";
import { MainIssueJobTInput } from "./common";

export const Job_jiraIssue = new JobType<Env, MainIssueJobTInput, JiraIssue>({
    cpl: "CODE00000230",
    type: "jiraIssue",
    stored: true,
    func: async (env: Env, job: Job, input: MainIssueJobTInput): Promise<JiraIssue> => {
        job.setStep("CODE00000229", "Requesting issue from Jira.", "JiraResponse");
        const newIssue = await env.jira.getIssueById(Object.assign({ expand: ["changelog"] }, input));
        if (env.settings.ignoredJiraFields)
            for (const fieldName of env.settings.ignoredJiraFields) delete (newIssue.fields as any)[fieldName];
        return newIssue;
    },
});

export interface JiraWorklog {
    type: "JiraWorklog";
    issueId: string;
    worklogs: JiraWorklogItem[];
}

export const Job_jiraWorklog = new JobType<Env, MainIssueJobTInput, JiraWorklog>({
    cpl: "CODE00000182",
    type: "jiraWorklog",
    stored: true,
    func: async (env: Env, job: Job, input: MainIssueJobTInput): Promise<JiraWorklog> => {
        job.setStep("CODE00000127", "Requesting issue worklog from Jira.", "JiraResponse");

        return {
            type: "JiraWorklog",
            issueId: input.issueId,
            worklogs: await env.jira.getWorkLogs(input.issueId),
        };
    },
});

export interface JiraComments {
    type: "JiraComments";
    issueId: string;
    comments: JiraComment[];
}

export interface JiraLink {
    type: "JiraLink";
    issueIf: string;
    links: JiraLinkItem[];
}

export const Job_jiraComments = new JobType<Env, MainIssueJobTInput, JiraComments>({
    cpl: "CODE00000128",
    type: "jiraComments",
    stored: true,
    func: async (env: Env, job: Job, input: MainIssueJobTInput): Promise<JiraComments> => {
        job.setStep("CODE00000123", "Requesting issue comments from Jira.", "JiraResponse");

        return {
            type: "JiraComments",
            issueId: input.issueId,
            comments: await env.jira.getComments(input.issueId),
        };
    },
});
