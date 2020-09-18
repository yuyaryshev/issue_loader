import { EnvWithDbdJiraIssue } from "../other/Env";
import { EmptyJobTInput, Job, JobContext, JobType, throwUnload } from "Yjob";
import { Job_transformIssue } from "./Job_transformIssue";
import { issueContext, IssueContextInput } from "./IssueContext";
import { JobContextStatus, JobStatus, SerializedJob, SerializedJobContext } from "./JobFieldsServer";
import { OracleConnection0 } from "Yoracle";
import { DCommentItem, DIssueErrorParentItem } from "dbDomains";

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
        job.setStep("CODE00000148", "Waiting for load and transform...", "DbResponse");

        const transformed = await throwUnload(Job_transformIssue.getResult(job, "transformIssue"));
        if (!transformed) throw new Error(`CODE00000176 NO_DATA_FOUND from Transform!`);

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

        // Если несколько родителей, то добавляем записсь в логи ошибок
        if (transformed.parentAndChields.parentIssueKey === "ERROR_WE_HAVE_TWO_OR_MORE_PARENTS") {
            env.oracleBatchWriter.add(env.dbdDIssueErrorParentItem, [
                {
                    ISSUEKEY: transformed.parentAndChields.issueKey,
                    TS: transformed.parentAndChields.TS,
                    DELETED_FLAG: "N",
                },
            ] as DIssueErrorParentItem[]);
        }

        await env.oracleBatchWriter.add(env.dbdDLinkItem, transformed.links);

        if (env.settings.write_into_log_tables && env.startMode !== "run_into_cash") {
            env.oracleScheduler.startScheduler();
        }

        if (job.jobContext.newIssue) {
            //запускаем генератор задач
            env.jobStorage.my_console.log(`CODE00000372`, `НОВАЯ ЗАДАЧА - ${transformed.issues[0].issuekey}`);
            if ((transformed.issues[0].summary as any).indexOf("%ГЕНЕРАЦИЯ") == 0) {
                if (env.settings.generate_issues_on) {
                    env.issueSniffer.processingNewIssue(job, transformed);
                }
            }
            // Задача перестает быть новой
            job.jobContext.newIssue = 0;
        }

        //проверяем статусы
        if (env.settings.generate_issues_on) {
            if (transformed.issues[0].project == "DATAMAP") {
                if (
                    transformed.issues[0].status == "Ожидание пререквизита" ||
                    transformed.issues[0].status == "В очереди"
                ) {
                    env.issueSniffer.processingPrerequisiteParent(job, transformed);
                }

                //пробуем менять статусы если необходимо
                env.issueSniffer.processingUpdateStatus(job, transformed);
            }

            //наследуем поля
            if (
                transformed.issues[0].project == "DATAMAP" &&
                (transformed.issues[0].summary as any).indexOf("%СИНХРОНИЗАЦИЯ") == 0
            ) {
                if (transformed.parentAndChields.chieldIssueKeys.length) {
                    env.issueSniffer.processingInheritance(job, transformed);
                }
            }
        }
    },
});
