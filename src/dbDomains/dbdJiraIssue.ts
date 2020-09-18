import { JiraIssue, JiraUser } from "Yjira";
import { awaitDelay, debugMsgFactory, writeFileSyncIfChanged, yconsole } from "Ystd";
import { Env, EnvWithDbdJiraIssue } from "../other/Env";
import { DJiraFieldMarkedMeta } from "./dbdJiraField";
import { resolve } from "path";

import { dchangeLogFromJira, DChangelogItem } from "./dbdChangelogItem";
import { DWorklogItem, dworklogLogItemFromJira } from "./dbdWorklogItem";
import { DUser, duserFromJira } from "./dbdUser";
import { DLabel } from "./dbdLabel";

import { dcommentFromJira, DCommentItem } from "./dbdCommentItem";
import { DbDomainInput, DbDomFieldInput } from "./dbDomain";
import { OracleConnection0 } from "Yoracle";

const debugIssues = debugMsgFactory("run.issues");
const debugIssuesWriteToDbNormal = debugMsgFactory("normal.run.writeToDb.normal");

export const dbg_fieldMapper_path = resolve("./dbg_fieldMapper.js");
export const dbg_datetimeWalker_path = resolve("./dbg_datetimeWalker.js");

export interface DJiraIssue {
    [key: string]: string | boolean | undefined | Date;
}

export const makeFieldMapperSource = (markedFields: DJiraFieldMarkedMeta[]) => {
    const fieldMappers: string[] = ([
        ...markedFields
            .map((f) => {
                if (f.CUSTOM_ID) return undefined;

                switch (f.ID) {
                    case "issuekey":
                        return `${f.TARGET_NAME}:a.key`;

                    case "created":
                    case "updated":
                    case "resolutiondate":
                    case "lastViewed":
                    case "timeestimate":
                    case "timeoriginalestimate":
                    case "duedate":
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
                        return `${f.TARGET_NAME}:a.fields.${f.ID} && a.fields.${f.ID}.name`;

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
            .filter((v) => v),
        "\n        // custom fields",
        ...markedFields
            .map((f) => {
                if (f.CUSTOM_ID) {
                    switch (f.TYPE) {
                        case "string":
                        case "user":
                        case "date":
                        case "number":
                        case "priority":
                        case "datetime":
                        case "issuetype":
                        case "option":
                            return `${f.TARGET_NAME}:typeof a.fields.${f.ID} === 'object'?(a.fields.${f.ID}.value?a.fields.${f.ID}.value:a.fields.${f.ID}.name):a.fields.${f.ID}`;
                        case "array":
                            return `${f.TARGET_NAME}: a.fields.${f.ID}?(a.fields.${f.ID}.length?(a.fields.${f.ID}.map(a => {return a.name?a.name:(a.value?a.value:a)}).join(',')):undefined):undefined`;
                    }
                }
                return undefined;
            })
            .filter((v) => v),
    ] as any) as string[];

    const js = `(a) => ({
        ID:a.id,

${fieldMappers.map((s) => "        " + s).join(",\n")}
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
        .map((f) => `    a.fields.${f.ID} = callback(a.fields,'${f.ID}');\n`)
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

// TODO delete this DEPRICATED mode (insert into _t tables)
export const dbdJiraIssueInput = (fieldsMeta: DJiraFieldMarkedMeta[]): DbDomainInput<DJiraIssue, JiraIssue> => {
    return {
        name: "ISSUE_T",
        hasChangesTable: true,
        // table: "ISSUE_T_LOG",
        // changesTable: "ISSUE_LOG_CHANGES",
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
            {
                name: "DELETED_FLAG",
                type: "dwh_flag",
                nullable: false,
                pk: false,
                insert: true,
            } as DbDomFieldInput,
            {
                name: "PARENT_ISSUEKEY",
                type: "string100",
                nullable: true,
                pk: false,
                insert: true,
            } as DbDomFieldInput,
            ...fieldsMeta.map((f) => {
                return {
                    name: f.TARGET_NAME,
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

export const dbdJiraIssueInputLog = (fieldsMeta: DJiraFieldMarkedMeta[]): DbDomainInput<DJiraIssue, JiraIssue> => {
    return {
        name: "ISSUE_T_LOG",
        hasChangesTable: false,
        deleteByIssueKeyBeforeMerge: false,

        fields: [
            {
                name: "ID",
                type: "string100",
                nullable: false,
                pk: false,
                insert: true,
            } as DbDomFieldInput,
            {
                name: "TS",
                type: "string40",
                nullable: true,
                pk: false,
                insert: true,
            } as DbDomFieldInput,
            {
                name: "DELETED_FLAG",
                type: "dwh_flag",
                nullable: false,
                pk: false,
                insert: true,
            } as DbDomFieldInput,
            {
                name: "PARENT_ISSUEKEY",
                type: "string40",
                nullable: true,
                pk: false,
                insert: true,
            } as DbDomFieldInput,
            ...fieldsMeta.map((f) => {
                return {
                    name: f.TARGET_NAME,
                    type: f.ISSUE_LOADER_TYPE,
                    nullable: !["ISSUEKEY", "PROJECT"].includes(f.ID),
                    pk: false,
                    insert: true,
                } as DbDomFieldInput;
            }),
        ],
        fromJira: compileFieldMapper(fieldsMeta),
        datetimeWalker: compiledDatetimeWalker(fieldsMeta),
    };
};

export async function writeDbFinalize(env: Env, ls_id: string | undefined, last_updated_ts: string | undefined) {
    while (true)
        try {
            debugIssuesWriteToDbNormal(`CODE00000033`, `Connecting to db...`);
            await env.dbProvider(async function (db: OracleConnection0) {
                if (last_updated_ts) {
                    debugIssuesWriteToDbNormal(`CODE00000034`, `Saving LAST_UPDATED_TS...`);
                    await db.execute(
                        `update ${env.settings.tables.LOAD_STREAM_T} set LAST_UPDATED_TS = :1 where id = :2`,
                        [last_updated_ts, ls_id]
                    );
                    debugIssuesWriteToDbNormal(`CODE00000035`, `Saving LAST_UPDATED_TS - OK`);

                    debugIssuesWriteToDbNormal(`CODE00000036`, `Commiting...`);
                    await db.commit();
                    debugIssuesWriteToDbNormal(`CODE00000037`, `Commited - OK`);
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
