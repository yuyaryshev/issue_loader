import { Job_jiraComments, Job_jiraIssue, Job_jiraWorklog } from "./Job_jiraIssue";
import { Env, EnvWithDbdJiraIssue } from "other";
import { EmptyJobTInput, Job, JobContext, JobType, throwUnload } from "Yjob";
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
import { issueContext, IssueContextInput } from "./IssueContext";
import { JobContextStatus, JobStatus, SerializedJob, SerializedJobContext } from "./JobFieldsServer";
import moment from "moment";

export interface AllJiraDataTransformed {
    issues: DJiraIssue[];
    changelogs: DChangelogItem[];
    worklogs: DWorklogItem[];
    comments: DCommentItem[];
    labels: DLabel[];
    users: DUser[];
    links: DLinkItem[];
}

export const Job_transformIssue = new JobType<
    EnvWithDbdJiraIssue,
    IssueContextInput,
    EmptyJobTInput,
    AllJiraDataTransformed,
    JobContext<any>,
    Job,
    SerializedJobContext,
    JobContextStatus,
    SerializedJob,
    JobStatus
>({
    cpl: "CODE00000231",
    type: "transformIssue",
    stage: "02_transform",
    resources: { cpu: 1 },
    jobContextType: issueContext,
    presetDepsFunc: (env: EnvWithDbdJiraIssue, job: Job, contextInput: IssueContextInput, input: EmptyJobTInput) => {
        Job_jiraIssue.dep(job, { ...contextInput });
        Job_jiraWorklog.dep(job, { ...contextInput });
        Job_jiraComments.dep(job, { ...contextInput });
    },
    func: async (
        env: EnvWithDbdJiraIssue,
        job: Job,
        contextInput: IssueContextInput,
        jobInput: EmptyJobTInput
    ): Promise<AllJiraDataTransformed> => {
        // chagelog
        const issuePromise = Job_jiraIssue.runWait(env.jobStorage, job, contextInput);
        const worklogPromise = Job_jiraWorklog.runWait(env.jobStorage, job, contextInput);
        const commentPromise = Job_jiraComments.runWait(env.jobStorage, job, contextInput);

        const inputIssue = await throwUnload(issuePromise);
        const inputWorklog = await throwUnload(worklogPromise);
        const inputComments = await throwUnload(commentPromise);

        function safeTSToIso(x: { TS?: string | moment.Moment | undefined }) {
            try {
                if (!x) job.jobStorage.my_console.error(`CODE00000105`, "x is undefined!");

                const s = x ? x.TS : "";

                if (typeof s === "string") return s;
                if (!s) {
                    job.jobStorage.my_console.error(`CODE00000187`, "x.TS is undefined!");
                    return "";
                }

                try {
                    return s.format("YYYY-MM-DD HH:mm:ss");
                } catch (e) {
                    job.jobStorage.my_console.error(`CODE00000318`, e);
                }

                try {
                    return s.toString();
                } catch (e) {
                    job.jobStorage.my_console.error(`CODE00000130`, e);
                }

                try {
                    return s + "";
                } catch (e) {
                    job.jobStorage.my_console.error(`CODE00000141`, e);
                }

                return moment().format();
            } catch (e) {
                job.jobStorage.my_console.error(`CODE00000249`, "unknown error!");
                return "";
            }
        }

        // берем строковые значения дат необходимого формата 'YYYY-MM-DD hh:mm:ss '
        let TSJiraIssue: string = "0 ";
        let TSJiraWorklog: string = "0 ";
        let TSJiraComments: string = "0 ";

        TSJiraIssue = safeTSToIso(inputIssue) + " ";
        TSJiraWorklog = safeTSToIso(inputWorklog) + " ";
        TSJiraComments = safeTSToIso(inputComments) + " ";

        job.setStep("CODE00000232", "Transforming jira -> db format, issue", undefined);
        const issue = env.dbdJiraIssue.fromJira!(inputIssue);
        issue.TS = TSJiraIssue + env.sequenceTS.nextValue();

        issue.DELETED_FLAG = issue.status ? (issue.status == "Удалена" ? "Y" : "N") : "N";
        const issues = [issue];

        // TODO раньше, когда тут была массовая ошибка. Система работала Yjob криво - часть job не переходила в transform

        job.setStep("CODE00000156", "Transforming jira -> db format, changelogs", undefined);
        const changelogs = dchangeLogFromJira(inputIssue.key, inputIssue.changelog, TSJiraIssue, env);

        job.setStep("CODE00000227", "Transforming jira -> db format, comments", undefined);
        const comments = inputComments.comments.map(jiraComment => {
            return dcommentFromJira(inputIssue.key, jiraComment, TSJiraComments, env);
        });

        job.setStep("CODE00000228", "Transforming jira -> db format, worklogs", undefined);
        const worklogs = inputWorklog.worklogs.map(jiraWorklog => {
            return dworklogLogItemFromJira(inputIssue.key, jiraWorklog, TSJiraWorklog, env);
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
            return dlinkItemFromJira(inputIssue.key, currLink, TSJiraIssue, env);
        });

        // собираем 'не традиционные' линки со связями типа epic->task и task->subtask
        // customfield_10376 - содержит ссылку из issue на его epic
        job.setStep("CODE03000221", "Transforming customfield_10376", undefined);
        if (inputIssue.fields.customfield_10376) {
            if (env.settings.write_into_log_tables) {
                links.push({
                    ISSUEKEY: inputIssue.key,
                    ID: "task-epic-" + inputIssue.id,
                    OUTWARDISSUE: inputIssue.fields.customfield_10376,
                    TYPEID: "task-epic",
                    TS: TSJiraIssue + env.sequenceTS.nextValue(),
                    DELETED_FLAG: "N",
                }); /// try to task-epic
            } else {
                links.push({
                    ISSUEKEY: inputIssue.key,
                    ID: "task-epic-" + inputIssue.id,
                    OUTWARDISSUE: inputIssue.fields.customfield_10376,
                    TYPEID: "task-epic",
                }); /// try to task-epic
            }
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
