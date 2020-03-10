import { JiraIssue, JiraUser } from "Yjira";
import { awaitDelay, debugMsgFactory, writeFileSyncIfChanged, yconsole } from "Ystd";
import { Env, EnvWithDbdJiraIssue, OracleConnection } from "../other/Env";
import { DJiraFieldMarkedMeta } from "./dbdJiraField";
import { resolve } from "path";

import { dchangeLogFromJira, DChangelogItem } from "./dbdChangelogItem";
import { DWorklogItem, dworklogLogItemFromJira } from "./dbdWorklogItem";
import { DUser, duserFromJira } from "./dbdUser";
import { DLabel } from "./dbdLabel";

import { dcommentFromJira, DCommentItem } from "./dbdCommentItem";
import { DbDomainInput, DbDomFieldInput } from "./dbDomain";

const debugIssues = debugMsgFactory("run.issues");

export const dbg_fieldMapper_path = resolve("./dbg_fieldMapper.js");
export const dbg_datetimeWalker_path = resolve("./dbg_datetimeWalker.js");

export interface DJiraIssue {
    [key: string]: string | boolean | undefined | Date;
}

export const makeFieldMapperSource = (markedFields: DJiraFieldMarkedMeta[]) => {
    const fieldMappers: string[] = ([
        ...markedFields
            .map(f => {
                if (f.CUSTOM_ID) return undefined;

                switch (f.ID) {
                    case "issuekey":
                        return `${f.TARGET_NAME}:a.key`;

                    case "created":
                    case "updated":
                    case "resolutionDate":
                    case "lastViewed":
                    case "dueDate":
                        // datetime string
                        return `${f.TARGET_NAME}:a.fields.${f.ID}`;

                    case "summary":
                        // long strings
                        return `${f.TARGET_NAME}:a.fields.${f.ID}`;

                    case "project":
                        // strings
                        return `${f.TARGET_NAME}:a.fields.${f.ID} && a.fields.${f.ID}.key`;

                    case "creator":
                    case "reporter":
                    case "assignee":
                        // user - strings
                        return `${f.TARGET_NAME}:a.fields.${f.ID} && a.fields.${f.ID}.key`;

                    case "status":
                    case "issuetype":
                        // strings by name
                        return `${f.TARGET_NAME}:a.fields.${f.ID} && a.fields.${f.ID}.name`;

                    case "attachment":
                        yconsole.warn(
                            `CODE00000008`,
                            `Jira field '${f.ID}' - is not supported by issue_loader. Need to fix javascript code to handle this field.`
                        );
                        return undefined;

                    default:
                        yconsole.warn(
                            `CODE00000009`,
                            `Jira field '${f.ID}' - is not supported by issue_loader. Need to fix javascript code to handle this field.`
                        );
                        return undefined;
                }
            })
            .filter(v => v),
        "\n        // custom fields",
        ...markedFields
            .map(f => {
                if (f.CUSTOM_ID) {
                    return `${f.TARGET_NAME}:a.fields.${f.ID} && a.fields.${f.ID}.value`;
                }
                return undefined;
            })
            .filter(v => v),
    ] as any) as string[];

    const js = `(a) => ({
        ID:a.id,

${fieldMappers.map(s => "        " + s).join(",\n")}
})`;

    const fieldMapperSourceFile =
        `// THIS IS A AUTO-GENERATED FILE - ALL CHANGES WILL BE LOST. ITS NOT USED IN PRODUCTION LOADING.\n` +
        `module.exports = {fieldMapper: ${js}};`;

    if (writeFileSyncIfChanged(dbg_fieldMapper_path, fieldMapperSourceFile))
        yconsole.log(`CODE00000010`, `Saved new issue field mapper code to '${dbg_fieldMapper_path}'`);

    return js;
};

export const compileFieldMapper = (markedFields: DJiraFieldMarkedMeta[]): ((a: JiraIssue) => DJiraIssue) => {
    const sourceCode = makeFieldMapperSource(markedFields);
    return eval(sourceCode);
};

export const isDatetimeJiraType = (f: DJiraFieldMarkedMeta) =>
    f.TYPE == "date" || f.TYPE == "datetime" || f.TYPE == "timestamp";

export const makeDatetimeWalkerSource = (markedFields: DJiraFieldMarkedMeta[]) => {
    const jsBody = markedFields
        .filter(isDatetimeJiraType)
        .map(f => `    a.fields.${f.ID} = callback(a.fields,'${f.ID}');\n`)
        .join("");

    const js = `(callback,a) => {\n${jsBody}\n    return a;\n    }`;

    const datetimeWalkerSourceFile =
        `// THIS IS A AUTO-GENERATED FILE - ALL CHANGES WILL BE LOST. ITS NOT USED IN PRODUCTION LOADING.\n` +
        `module.exports = {datetimeWalker: ${js}};`;

    if (writeFileSyncIfChanged(dbg_datetimeWalker_path, datetimeWalkerSourceFile))
        yconsole.log(`CODE00000011`, `Saved new DatetimeWalker code to '${dbg_datetimeWalker_path}'`);

    return js;
};

export const compiledDatetimeWalker = (markedFields: DJiraFieldMarkedMeta[]) => {
    const sourceCode = makeDatetimeWalkerSource(markedFields);
    const evl = eval(sourceCode);
    return evl;
};

export const dbdJiraIssueInput = (fieldsMeta: DJiraFieldMarkedMeta[]): DbDomainInput<DJiraIssue, JiraIssue> => {
    return {
        name: "ISSUE_T",
        hasChangesTable: true,
        // table: "ISSUE_T",
        // changesTable: "ISSUE_T_CHANGES",
        // handlerStoredProc: "HANDLE_ISSUE_T_CHANGES",
        deleteByIssueKeyBeforeMerge: false,
        fields: [
            {
                name: "ID",
                type: "string100",
                nullable: false,
                pk: false,
                insert: true,
            } as DbDomFieldInput,
            ...fieldsMeta.map(f => {
                return {
                    name: f.ID,
                    type: f.ISSUE_LOADER_TYPE,
                    nullable: !["ISSUEKEY", "PROJECT"].includes(f.ID),
                    pk: f.ID.toUpperCase() === "ISSUEKEY",
                    insert: true,
                } as DbDomFieldInput;
            }),
        ],
        fromJira: compileFieldMapper(fieldsMeta),
        datetimeWalker: compiledDatetimeWalker(fieldsMeta),
    };
};

export async function writeJiraIssuesToDb(env: EnvWithDbdJiraIssue, jiraIssues: JiraIssue[]) {
    if (jiraIssues.length) {
        const worklogs: DWorklogItem[] = [];
        const changelogs: DChangelogItem[] = [];
        const comments: DCommentItem[] = [];
        const labelsMap: Map<string, DLabel> = new Map();
        const usersMap: Map<string, DUser> = new Map();

        for (let issue of jiraIssues) {
            if (!issue || !issue.fields) continue;

            if (
                issue.fields &&
                issue.fields.worklog &&
                issue.fields.worklog.worklogs &&
                issue.fields.worklog.worklogs.length
            )
                for (let i of issue.fields.worklog.worklogs) worklogs.push(dworklogLogItemFromJira(issue.key, i));

            if (issue.changelog && issue.changelog) changelogs.push(...dchangeLogFromJira(issue.key, issue.changelog));

            let issueUsers: (JiraUser | undefined)[] = [
                issue.fields.creator,
                issue.fields.reporter,
                issue.fields.assignee,
            ];
            for (let u of issueUsers) if (u && !usersMap.has(u.key)) usersMap.set(u.key, duserFromJira(u));

            for (let lb_str of issue.fields.labels) {
                const lb = { ISSUEKEY: issue.key, FIELD: "labels", NAME: lb_str.trim() };
                labelsMap.set(JSON.stringify(lb), lb);
            }

            if (issue.fields.comment)
                for (let c of issue.fields.comment.comments) comments.push(dcommentFromJira(issue.key, c));
        }

        const users: DUser[] = [...usersMap.values()];
        const labels: DLabel[] = [...labelsMap.values()];

        const issues = jiraIssues.map(i => env.dbdJiraIssue.fromJira!(i));

        while (true)
            try {
                debugIssues(`CODE00000214`, `Connecting to db...`);
                await env.dbProvider(async function(db: OracleConnection) {
                    if (issues.length) {
                        debugIssues(`CODE00000215`, `Inserting issues...`);
                        await env.dbdJiraIssue.insertMany(db, issues);
                        await db.commit();

                        debugIssues(`CODE00000216`, `Merging issues...`);
                        await env.dbdJiraIssue.executeMerge!(db);
                        await db.commit();
                    } else {
                        debugIssues(`CODE00000217`, `No issues - OK`);
                    }

                    if (worklogs.length) {
                        debugIssues(`CODE00000258`, `Inserting worklogs...`);
                        await env.dbdDWorklogItem.insertMany(db, worklogs);
                        await db.commit();

                        debugIssues(`CODE00000259`, `Merging worklogs...`);
                        await env.dbdDWorklogItem.executeMerge!(db);
                        await db.commit();
                    } else {
                        debugIssues(`CODE00000260.2`, `No worklogs - OK`);
                    }

                    if (changelogs.length) {
                        debugIssues(`CODE00000261`, `Inserting changelogs...`);
                        await env.dbdDChangelogItem.insertMany(db, changelogs);
                        await db.commit();

                        debugIssues(`CODE00000262`, `Merging changelogs...`);
                        await env.dbdDUser.executeMerge!(db);
                        await db.commit();
                    } else {
                        debugIssues(`CODE00000263.2`, `No changelogs - OK`);
                    }

                    if (users.length) {
                        debugIssues(`CODE00000264`, `Inserting users...`);
                        await env.dbdDUser.insertMany(db, users);
                        await db.commit();

                        debugIssues(`CODE00000265`, `Merging users...`);
                        await env.dbdDUser.executeMerge!(db);
                        await db.commit();
                    } else {
                        debugIssues(`CODE00000266.2`, `No users - OK`);
                    }

                    if (labels.length) {
                        debugIssues(`CODE00000267`, `Inserting labels...`);
                        await env.dbdDLabel.insertMany(db, labels);
                        await db.commit();

                        debugIssues(`CODE00000268`, `Merging labels...`);
                        await env.dbdDLabel.executeMerge!(db);
                        await db.commit();
                    } else {
                        debugIssues(`CODE00000269.2`, `No labels - OK`);
                    }

                    if (comments.length) {
                        debugIssues(`CODE00000270`, `Inserting comments...`);
                        await env.dbdDCommentItem.insertMany(db, comments);
                        await db.commit();

                        debugIssues(`CODE00000271`, `Merging comments...`);
                        await env.dbdDCommentItem.executeMerge!(db);
                        await db.commit();
                    } else {
                        debugIssues(`CODE00000272.2`, `No comments - OK`);
                    }

                    debugIssues(`CODE00000218`, `Writing issues to db - OK`);
                });
                return;
            } catch (e) {
                yconsole.error(
                    `CODE00000219`,
                    `Database returned error `,
                    e,
                    ` waiting ${env.settings.timeouts.dbRetry} ms to retry...`
                );
                await awaitDelay(env.settings.timeouts.dbRetry);
            }
    }
}

export async function writeDbFinalize(env: Env, ls_id: string | undefined, last_updated_ts: string | undefined) {
    while (true)
        try {
            debugIssues(`CODE00000033`, `Connecting to db...`);
            await env.dbProvider(async function(db: OracleConnection) {
                if (last_updated_ts) {
                    debugIssues(`CODE00000034`, `Saving LAST_UPDATED_TS...`);
                    await db.execute(
                        `update ${env.settings.tables.LOAD_STREAM_T} set LAST_UPDATED_TS = :1 where id = :2`,
                        [last_updated_ts, ls_id]
                    );
                    debugIssues(`CODE00000035`, `Saving LAST_UPDATED_TS - OK`);

                    debugIssues(`CODE00000036`, `Commiting...`);
                    await db.commit();
                    debugIssues(`CODE00000037`, `Commited - OK`);
                }
            });
            return;
        } catch (e) {
            yconsole.error(
                `CODE00000038`,
                `Error writing to ${env.settings.tables.ISSUE_T_CHANGES} table `,
                e,
                ` waiting ${env.settings.timeouts.dbRetry} ms to retry...`
            );
            await awaitDelay(env.settings.timeouts.dbRetry);
        }
}
