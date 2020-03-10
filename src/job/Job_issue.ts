import { EnvWithDbdJiraIssue, OracleConnection } from "../other/Env";
import { Job, JobType, throwUnload } from "Yjob";
import { Job_transformIssue } from "./Job_transformIssue";
import { MainIssueJobTInput } from "./common";

export const Job_issue = new JobType<EnvWithDbdJiraIssue, MainIssueJobTInput, void>({
    cpl: "CODE00000236",
    type: "writeIssueToDb",
    stored: true,
    func: async (env: EnvWithDbdJiraIssue, job: Job, input: MainIssueJobTInput): Promise<void> => {
        job.setStep("CODE00000148", "Waiting for load and transform...", "DbResponse");

        const transformed = await throwUnload(Job_transformIssue.run(env.jobStorage, job, input));
        if (!transformed) throw new Error(`CODE00000176 Got unexpected data from Jira!`);

        job.setStep("CODE00000171", "Connecting to db...", "DbResponse");

        await env.dbProvider(async function(db: OracleConnection) {
            job.setStep("CODE00000238", "Writing to db...", "DbResponse");
            if (transformed.issues.length) {
                job.setStep("CODE00000239", "inserting issues...", "DbResponse");
                await env.dbdJiraIssue.insertMany(db, transformed.issues);
                await db.commit();

                job.setStep("CODE00000240", "merging issues...", "DbResponse");
                await env.dbdJiraIssue.executeMerge!(db);
                await db.commit();

                /////////////////////

                if (transformed.worklogs.length) {
                    job.setStep(`CODE00000241`, `Inserting worklogs...`, "DbResponse");
                    await env.dbdDWorklogItem.insertMany(db, transformed.worklogs);
                    await db.commit();

                    job.setStep(`CODE00000242`, `Merging worklogs...`, "DbResponse");
                    await env.dbdDWorklogItem.executeMerge!(db);
                    await db.commit();
                } else {
                    job.setStep(`CODE00000243.2`, `No worklogs - OK`, undefined);
                }

                if (transformed.changelogs.length) {
                    job.setStep(`CODE00000244`, `Inserting changelogs...`, "DbResponse");
                    await env.dbdDChangelogItem.insertMany(db, transformed.changelogs);
                    await db.commit();

                    job.setStep(`CODE00000245`, `Merging changelogs...`, "DbResponse");
                    await env.dbdDChangelogItem.executeMerge!(db);
                    await db.commit();
                } else {
                    job.setStep(`CODE00000246.2`, `No changelogs - OK`, undefined);
                }

                if (transformed.users.length) {
                    job.setStep(`CODE00000247`, `Inserting users...`, "DbResponse");
                    await env.dbdDUser.insertMany(db, transformed.users);
                    await db.commit();

                    job.setStep(`CODE00000248`, `Merging users...`, "DbResponse");
                    await env.dbdDUser.executeMerge!(db);
                    await db.commit();
                } else {
                    job.setStep(`CODE00000249.2`, `No users - OK`, undefined);
                }

                if (transformed.labels.length) {
                    job.setStep(`CODE00000250`, `Inserting labels...`, "DbResponse");
                    await env.dbdDLabel.insertMany(db, transformed.labels);
                    await db.commit();

                    job.setStep(`CODE00000251`, `Merging labels...`, "DbResponse");
                    await env.dbdDLabel.executeMerge!(db);
                    await db.commit();
                } else {
                    job.setStep(`CODE00000252.2`, `No labels - OK`, undefined);
                }

                if (transformed.comments.length) {
                    job.setStep(`CODE00000221`, `Inserting comments...`, "DbResponse");
                    await env.dbdDCommentItem.insertMany(db, transformed.comments);
                    await db.commit();

                    job.setStep(`CODE00000222`, `Merging comments...`, "DbResponse");
                    await env.dbdDCommentItem.executeMerge!(db);
                    await db.commit();
                } else {
                    job.setStep(`CODE00000223.2`, `No comments - OK`, undefined);
                }

                if (transformed.links.length) {
                    job.setStep(`CODE00000224`, `Inserting links...`, "DbResponse");
                    await env.dbdDLinkItem.insertMany(db, transformed.links);
                    await db.commit();

                    job.setStep(`CODE00000116`, `Merging links...`, "DbResponse");
                    await env.dbdDLinkItem.executeMerge!(db);
                    await db.commit();
                } else {
                    job.setStep(`CODE00000117.2`, `No links - OK`, undefined);
                }

                /////////////////////
            } else {
                job.setStep("CODE00000256", "No issues - OK", "DbResponse");
            }

            job.setStep("CODE00000257", "Finished writing to db...", "DbResponse");
        });
    },
});
