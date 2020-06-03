import { EnvWithDbdJiraIssue } from "../other/Env";
import { EmptyJobTInput, Job, JobContext, JobType, throwUnload } from "Yjob";
import { Job_transformIssue } from "./Job_transformIssue";
import { issueContext, IssueContextInput } from "./IssueContext";
import { JobContextStatus, JobStatus, SerializedJob, SerializedJobContext } from "./JobFieldsServer";
import { OracleConnection0 } from "Yoracle";

export const Job_issue = new JobType<
    EnvWithDbdJiraIssue,
    IssueContextInput,
    EmptyJobTInput,
    void,
    JobContext<any>,
    Job,
    SerializedJobContext,
    JobContextStatus,
    SerializedJob,
    JobStatus
>({
    cpl: "CODE00000236",
    type: "writeIssueToDb",
    stage: "03_db",
    resources: { db: 1 },
    jobContextType: issueContext,
    presetDepsFunc: (env: EnvWithDbdJiraIssue, job: Job, contextInput: IssueContextInput, input: EmptyJobTInput) => {
        Job_transformIssue.dep(job, { ...contextInput });
        // TODO presetDepsFunc - должна откуда-то кем то вызываться. Job'ы не должны стартовать без зависимостей
    },
    func: async (
        env: EnvWithDbdJiraIssue,
        job: Job,
        contextInput: IssueContextInput,
        input: EmptyJobTInput
    ): Promise<void> => {
        try {
        } finally {
        }
        job.setStep("CODE00000148", "Waiting for load and transform...", "DbResponse");

        const transformed = await throwUnload(Job_transformIssue.runWait(env.jobStorage, job, contextInput));
        if (!transformed) throw new Error(`CODE00000176 Got unexpected data from Jira!`);

        job.setStep("CODE00000171", "Waiting for oracleBatchWriter", "DbResponse");

        /*no_await*/
        env.oracleBatchWriter.add(env.dbdJiraIssue, transformed.issues);
        /*no_await*/
        env.oracleBatchWriter.add(env.dbdDWorklogItem, transformed.worklogs);
        /*no_await*/
        env.oracleBatchWriter.add(env.dbdDChangelogItem, transformed.changelogs);
        /*no_await*/
        env.oracleBatchWriter.add(env.dbdDUser, transformed.users);
        /*no_await*/
        env.oracleBatchWriter.add(env.dbdDLabel, transformed.labels);
        /*no_await*/
        env.oracleBatchWriter.add(env.dbdDCommentItem, transformed.comments);
        await env.oracleBatchWriter.add(env.dbdDLinkItem, transformed.links);

        if (env.settings.write_into_log_tables) {
            env.oracleScheduler.startScheduler();
        }
    },
});
