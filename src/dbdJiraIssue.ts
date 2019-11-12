import { JiraIssue } from "./JiraWrapper";
import { writeFileSyncIfChanged } from "./writeFileSyncIfChanged";
import { OracleConnection, Env, EnvWithDbdJiraIssue } from "./startEnv";
import { DbDomFieldInput } from "./dbDomain";
import { yconsole, debugMsgFactory } from "./consoleMsg";
import { DJiraFieldMarkedMeta } from "./dbdJiraField";
import { resolve } from "path";
import { awaitDelay } from "./awaitDelay";
import { Decoder, object, string, number, boolean, optional, oneOf, constant } from "@mojotech/json-type-validation";
import moment from "moment";

const debugIssues = debugMsgFactory("run.issues");

export const dbg_fieldMapper_path = resolve("./dbg_fieldMapper.js");
export const dbg_datetimeWalker_path = resolve("./dbg_datetimeWalker.js");

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
                            `T3502`,
                            `Jira field '${f.ID}' - is not supported by issue_loader. Need to fix javascript code to handle this field.`
                        );
                        return undefined;

                    default:
                        yconsole.warn(
                            `T3502`,
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
            .filter(v => v)
    ] as any) as string[];

    const js = `(a) => ({
        ID:a.id,

${fieldMappers.map(s => "        " + s).join(",\n")}
})`;

    const fieldMapperSourceFile =
        `// THIS IS A AUTO-GENERATED FILE - ALL CHANGES WILL BE LOST. ITS NOT USED IN PRODUCTION LOADING.\n` +
        `module.exports = {fieldMapper: ${js}};`;

    if (writeFileSyncIfChanged(dbg_fieldMapper_path, fieldMapperSourceFile))
        yconsole.log(`T0851`, `Saved new issue field mapper code to '${dbg_fieldMapper_path}'`);

    return js;
};

export const compileFieldMapper = (markedFields: DJiraFieldMarkedMeta[]) => {
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
        yconsole.log(`T0855`, `Saved new DatetimeWalker code to '${dbg_datetimeWalker_path}'`);

    return js;
};

export const compiledDatetimeWalker = (markedFields: DJiraFieldMarkedMeta[]) => {
    const sourceCode = makeDatetimeWalkerSource(markedFields);
    const evl = eval(sourceCode);
    return evl;
};

export const dbdJiraIssueInput = (fieldsMeta: DJiraFieldMarkedMeta[]) => {
    return {
        name: "JIRA_ISSUE",
        table: "JIRA_ISSUE",
        changesTable: "JIRA_ISSUE_CHANGES",
        handlerStoredProc: "HANDLE_JIRA_ISSUE_CHANGES",
        fields: [
            {
                name: "ID",
                type: "string40",
                nullable: false,
                pk: false,
                insert: true
            } as DbDomFieldInput,
            ...fieldsMeta.map(f => {
                return {
                    name: f.ID,
                    type: f.ISSUE_LOADER_TYPE,
                    nullable: !["ISSUEKEY", "PROJECT"].includes(f.ID),
                    pk: f.ID.toUpperCase() === "ISSUEKEY",
                    insert: true
                } as DbDomFieldInput;
            })
        ],
        additionalMapper: compileFieldMapper(fieldsMeta),
        datetimeWalker: compiledDatetimeWalker(fieldsMeta)
    };
};

function onWriteJiraIssue(issue: JiraIssue) {
    // TODO_CURRENT обработать worklog и changelog
    if (issue && issue.fields && issue.fields.worklog && issue.fields.worklog.worklogs)
        for (let w of issue.fields.worklog.worklogs) {
            w.author;
        }
}

export async function writeJiraIssuesToDb(env: EnvWithDbdJiraIssue, issues: any[]) {
    if(issues.length)
    while (true)
        try {
            debugIssues(`T7221`, `Connecting to db...`);
            await env.dbProvider(async function(db: OracleConnection) {
                debugIssues(`T7202`, `Inserting...`);
                await env.dbdJiraIssue.insertMany(db, issues);

                debugIssues(`T7203`, `Merging...`);
                await env.dbdJiraIssue.executeMerge!(db);

                debugIssues(`T7304`, `Commiting...`);
                await db.commit();
                debugIssues(`T7305`, `Commited - OK`);
            });
            return;
        } catch (e) {
            yconsole.error(
                `T6103`,
                `Error writing to ${env.settings.tables.JIRA_ISSUE_CHANGES} table `,
                e,
                ` waiting ${env.settings.timeouts.dbRetry} ms to retry...`
            );
            await awaitDelay(env.settings.timeouts.dbRetry);
        }
}

export async function writeDbFinalize(env: Env, ls_id: string | undefined, last_updated_ts: string | undefined) {
    while (true)
        try {
            debugIssues(`T7201`, `Connecting to db...`);
            await env.dbProvider(async function(db: OracleConnection) {
                if (last_updated_ts) {
                    debugIssues(`T7204`, `Saving LAST_UPDATED_TS...`);
                    await db.execute(
                        `update ${env.settings.tables.LOAD_STREAM} set LAST_UPDATED_TS = :1 where id = :2`,
                        [last_updated_ts, ls_id]
                    );
                    debugIssues(`T7204`, `Saving LAST_UPDATED_TS - OK`);

                    debugIssues(`T7304`, `Commiting...`);
                    await db.commit();
                    debugIssues(`T7305`, `Commited - OK`);                    
                }
            });
            return;
        } catch (e) {
            yconsole.error(
                `T6103`,
                `Error writing to ${env.settings.tables.JIRA_ISSUE_CHANGES} table `,
                e,
                ` waiting ${env.settings.timeouts.dbRetry} ms to retry...`
            );
            await awaitDelay(env.settings.timeouts.dbRetry);
        }
}
