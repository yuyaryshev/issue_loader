import { Env } from "../other/Env";
import { EmptyJobTInput, Job, JobContext, JobType } from "Yjob";
import { JiraComment, JiraIssue, JiraLinkItem, JiraWorklogItem } from "Yjira";
import { issueContext, IssueContextInput } from "./IssueContext";
import { JobContextStatus, JobStatus, SerializedJob, SerializedJobContext } from "./JobFieldsServer";
import moment from "moment";

export const Job_jiraIssue = new JobType<
    Env,
    IssueContextInput,
    EmptyJobTInput,
    JiraIssue,
    JobContext<any>,
    Job,
    SerializedJobContext,
    JobContextStatus,
    SerializedJob,
    JobStatus
>({
    cpl: "CODE00000230",
    type: "jiraIssue",
    stage: "01_jira",
    resources: { jira: 1 },
    jobContextType: issueContext,
    func: async (env: Env, job: Job, contextInput: IssueContextInput, input: EmptyJobTInput): Promise<JiraIssue> => {
        job.setStep("CODE00000229", "Requesting issue from Jira.", "JiraResponse");
        const newIssue = await env.jira.getIssueByKey(Object.assign({ expand: ["changelog"] }, contextInput)); // берем changelog в JiraIssue
        if (env.settings.ignoredJiraFields)
            for (const fieldName of env.settings.ignoredJiraFields) delete (newIssue.fields as any)[fieldName];
        return Object.assign(newIssue, { TS: moment() });
    },
});

export interface JiraWorklog {
    type: "JiraWorklog";
    issueKey: string;
    worklogs: JiraWorklogItem[];
    TS: moment.Moment;
}

export const Job_jiraWorklog = new JobType<
    Env,
    IssueContextInput,
    EmptyJobTInput,
    JiraWorklog,
    JobContext<any>,
    Job,
    SerializedJobContext,
    JobContextStatus,
    SerializedJob,
    JobStatus
>({
    cpl: "CODE00000182",
    type: "jiraWorklog",
    stage: "01_jira",
    resources: { jira: 1 },
    jobContextType: issueContext,
    func: async (env: Env, job: Job, contextInput: IssueContextInput, input: EmptyJobTInput): Promise<JiraWorklog> => {
        job.setStep("CODE00000127", "Requesting issue worklog from Jira.", "JiraResponse");

        return {
            type: "JiraWorklog",
            issueKey: contextInput.issueKey,
            worklogs: await env.jira.getWorkLogs(contextInput.issueKey),
            TS: moment(),
        };
    },
});

export interface JiraComments {
    type: "JiraComments";
    issueKey: string;
    comments: JiraComment[];
    TS: moment.Moment;
}

export interface JiraLink {
    type: "JiraLink";
    issueIf: string;
    links: JiraLinkItem[];
}

export const Job_jiraComments = new JobType<
    Env,
    IssueContextInput,
    EmptyJobTInput,
    JiraComments,
    JobContext<any>,
    Job,
    SerializedJobContext,
    JobContextStatus,
    SerializedJob,
    JobStatus
>({
    cpl: "CODE00000128",
    type: "jiraComments",
    stage: "01_jira",
    resources: { jira: 1 },
    jobContextType: issueContext,
    func: async (env: Env, job: Job, contextInput: IssueContextInput, input: EmptyJobTInput): Promise<JiraComments> => {
        job.setStep("CODE00000123", "Requesting issue comments from Jira.", "JiraResponse");

        return {
            type: "JiraComments",
            issueKey: contextInput.issueKey,
            comments: await env.jira.getComments(contextInput.issueKey),
            TS: moment(),
        };
    },
});
