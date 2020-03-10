import { Job_jiraComments, Job_jiraIssue, Job_jiraWorklog } from "./Job_jiraIssue";
import { EnvWithDbdJiraIssue } from "other";
import { Job, JobType, throwUnload } from "Yjob";
import { JiraUser } from "Yjira";
import {
    dchangeLogFromJira,
    DChangelogItem,
    dcommentFromJira,
    DCommentItem,
    DJiraIssue,
    DLabel,
    DLinkItem,
    dlinkItemFromJira,
    DUser,
    duserFromJira,
    DWorklogItem,
    dworklogLogItemFromJira,
} from "dbDomains";
import { MainIssueJobTInput } from "./common";

export interface AllJiraDataTransformed {
    issues: DJiraIssue[];
    changelogs: DChangelogItem[];
    worklogs: DWorklogItem[];
    comments: DCommentItem[];
    labels: DLabel[];
    users: DUser[];
    links: DLinkItem[];
}

export const Job_transformIssue = new JobType<EnvWithDbdJiraIssue, MainIssueJobTInput, AllJiraDataTransformed>({
    cpl: "CODE00000231",
    type: "transformIssue",
    stored: true,
    func: async (env: EnvWithDbdJiraIssue, job: Job, input: MainIssueJobTInput): Promise<AllJiraDataTransformed> => {
        // chagelog
        const issuePromise = Job_jiraIssue.run(env.jobStorage, job, input);
        const worklogPromise = Job_jiraWorklog.run(env.jobStorage, job, input);
        const commentPromise = Job_jiraComments.run(env.jobStorage, job, input);

        const inputIssue = await throwUnload(issuePromise);
        const inputWorklog = await throwUnload(worklogPromise);
        const inputComments = await throwUnload(commentPromise);

        job.setStep("CODE00000232", "Transforming jira -> db format, issue", undefined);
        const issue = env.dbdJiraIssue.fromJira!(inputIssue);
        const issues = [issue];

        job.setStep("CODE00000156", "Transforming jira -> db format, changelogs", undefined);
        const changelogs = dchangeLogFromJira(inputIssue.key, inputIssue.changelog);

        job.setStep("CODE00000227", "Transforming jira -> db format, comments", undefined);
        const comments = inputComments.comments.map(jiraComment => {
            return dcommentFromJira(inputIssue.key, jiraComment);
        });

        job.setStep("CODE00000228", "Transforming jira -> db format, worklogs", undefined);
        const worklogs = inputWorklog.worklogs.map(jiraWorklog => {
            return dworklogLogItemFromJira(inputIssue.key, jiraWorklog);
        });

        // TODO scan for users in issue, worklog, changes, etc... add them here
        const jiraUsers: JiraUser[] = [];

        job.setStep("CODE00000235", "Transforming jira -> db format, users", undefined);
        const users = jiraUsers.map(jiraUser => {
            return duserFromJira(jiraUser);
        });

        job.setStep("CODE00000220", "Transforming jira -> db format, links", undefined);
        // собираем массив линков
        const links = inputIssue.fields.issuelinks.map(currLink => {
            return dlinkItemFromJira(inputIssue.key, currLink);
        });
        // собираем 'не традиционные' линки со связями типа epic->task и task->subtask
        // customfield_10376 - содержит ссылку из issue на его epic
        if (inputIssue.fields.customfield_10376) {
            links.push({
                ISSUEKEY: inputIssue.key,
                ID: "task-epic-" + inputIssue.id,
                OUTWARDISSUE: inputIssue.fields.customfield_10376,
                TYPEID: "task-epic",
            }); /// try to task-epic
        }

        // TODO scan for labels in issue, worklog, changes, etc... add them here
        const labels: DLabel[] = [];

        return {
            issues,
            worklogs,
            comments,
            changelogs,
            users,
            labels,
            links,
        };
    },
});
