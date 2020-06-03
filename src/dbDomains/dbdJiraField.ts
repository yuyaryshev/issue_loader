import { JiraField } from "Yjira";
import { Env } from "../other/Env";
import { DbDomainInput, DbDomFieldInput, decoderDomainFieldType, DomainFieldType } from "./dbDomain";
import { boolean, constant, Decoder, number, object, oneOf, optional, string } from "@mojotech/json-type-validation";
import { yconsole } from "Ystd";
import { OracleConnection0 } from "Yoracle";

export interface DJiraField {
    ID: string;
    CUSTOM_ID?: number | undefined;
    NAME: string;
    JAVA_TYPE?: string | undefined;
    TYPE: string;
}

export const decoderValidateFieldMeta: Decoder<DJiraField> = object({
    ID: string(),
    CUSTOM_ID: optional(number()),
    NAME: string(),
    JAVA_TYPE: optional(string()),
    TYPE: string(),
});

export const insertFieldsMap = (f: DJiraField) => [
    //
    f.ID,
    f.CUSTOM_ID,
    f.NAME,
    f.JAVA_TYPE,
    f.TYPE,
];

export const dbdDJiraFieldInput: DbDomainInput<DJiraField, JiraField> = {
    name: "JIRA_FIELD_T",
    hasChangesTable: true,
    deleteByIssueKeyBeforeMerge: false,
    fields: [
        { name: "ID", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "CUSTOM_ID", type: "number", nullable: true, pk: false, insert: false } as DbDomFieldInput,
        { name: "NAME", type: "string255", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "JAVA_TYPE", type: "string255", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TYPE", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,

        { name: "TARGET_NAME", type: "string100", nullable: true, pk: false, insert: false } as DbDomFieldInput,
        { name: "LOAD_FLAG", type: "dwh_flag", nullable: false, pk: false, insert: false, defaultValue: "'N'" },
        { name: "DELETED_FLAG", type: "dwh_flag", nullable: false, pk: false, insert: false, defaultValue: "'N'" },
        { name: "LOAD_ALG_OVERRIDE", type: "string100", nullable: true, pk: false, insert: false },
        { name: "ISSUE_LOADER_TYPE_OVERRIDE", type: "string100", nullable: true, pk: false, insert: false },
        { name: "ORACLE_TYPE_OVERRIDE", type: "string100", nullable: true, pk: false, insert: false },
    ] as DbDomFieldInput[],
};

export type FieldLoadAlg = "null" | "unsupported" | "primitive" | "user" | "array" | "status" | "option";

export const decoderFieldLoadAlg: Decoder<FieldLoadAlg> = oneOf(
    constant("null"),
    constant("unsupported"),
    constant("primitive"),
    constant("user"),
    constant("status"),
    constant("array"),
    constant("option")
);

export interface DJiraFieldMarkedMeta extends DJiraField {
    TARGET_NAME: string;
    LOAD_FLAG: string;
    DELETED_FLAG: string;
    LOAD_ALG_OVERRIDE?: FieldLoadAlg;
    ORACLE_TYPE_OVERRIDE?: string;
    ISSUE_LOADER_TYPE_OVERRIDE?: DomainFieldType;
    ISSUE_LOADER_TYPE: DomainFieldType;
    LOAD_ALG: FieldLoadAlg;
    LOAD: boolean;
}

export const isExcludedFieldAlg = (f: DJiraFieldMarkedMeta) => f.LOAD_ALG === "null" || f.LOAD_ALG === "unsupported";
export const isIncludedFieldAlg = (f: DJiraFieldMarkedMeta) => !isExcludedFieldAlg(f);

export const decoderDJiraFieldMarkedMeta: Decoder<DJiraFieldMarkedMeta> = object({
    ID: string(),
    CUSTOM_ID: optional(number()),
    NAME: string(),
    JAVA_TYPE: optional(string()),
    TYPE: string(),

    TARGET_NAME: string(),
    LOAD_FLAG: string(),
    DELETED_FLAG: string(),
    LOAD_ALG_OVERRIDE: optional(decoderFieldLoadAlg),
    ISSUE_LOADER_TYPE_OVERRIDE: optional(decoderDomainFieldType),
    ISSUE_LOADER_TYPE: decoderDomainFieldType,
    LOAD_ALG: decoderFieldLoadAlg,
    LOAD: boolean(),
});

export interface DJiraFieldMetas {
    [key: string]: DJiraField;
}

export const jiraGetAllFieldMetas = async (env: Env) => {
    // const allFields0 = await mockableRequest(env.settings, "jira.field.getAllFields", function() {
    //     return env.jira.field.getAllFields();
    // }); // {'customfield_10374' }
    const allFields0 = await env.jira.getAllFields();

    const allFields = {} as DJiraFieldMetas;
    for (let field of allFields0) {
        const jiraFieldMeta = {
            ID: field.id,
            NAME: field.name,
            CUSTOM_ID: field.schema && field.schema.customId,
            JAVA_TYPE: field.schema && field.schema.custom,
            TYPE: (field.schema && field.schema.type) || field.id,
        };
        try {
            decoderValidateFieldMeta.runWithException(jiraFieldMeta);
        } catch (e) {
            yconsole.error(
                `CODE00000122`,
                `Jira changed schema? Validation for message from jira failed. Failed to load field:\n ${JSON.stringify(
                    jiraFieldMeta,
                    undefined,
                    "    "
                )}\n\n`,
                e
            );
            continue;
        }
        allFields[field.id] = jiraFieldMeta;
    }
    return allFields;
};

export const selectFieldAlg = (f: DJiraFieldMarkedMeta): FieldLoadAlg => {
    switch (f.TYPE) {
        case "date":
        case "datetime":
        case "issuekey":
        case "number":
        case "string":
        case "priority":
        case "project":

        case "issuetype":
            return "primitive";

        case "array":
            return "array";

        case "user":
            return "user";

        case "status":
            return "status";

        case "securitylevel":
        case "comments-page":
        case "thumbnail":
        case "timetracking":
        case "watches":
            return "null"; // Точно игнорируем, поскольку эти данные получаются как то иначе или точно не нужны

        case "option":
            return "option";
        case "any":
        case "option-with-child":
        case "progress":
        case "resolution":

        case "version":
        case "votes":
            return "unsupported";
    }
    return "unsupported";
};

export const unknownJiraTypes = new Set();

export const selectFieldType = (f: DJiraFieldMarkedMeta): DomainFieldType => {
    switch (f.TYPE) {
        case "number":
            return "number";

        case "datetime":
            return "datetime";

        case "date":
            return "date";

        case "issuetype":
            return "string100";

        case "issuekey":
        case "priority":
        case "project":
        case "status":
            return "string100";

        case "user":
            return "string100";

        case "string":
            return "string2000";

        case "array":
            return "string2000";

        default:
            if (!unknownJiraTypes.has(f.TYPE)) {
                unknownJiraTypes.add(f.TYPE);
                yconsole.warn(`CODE00000003`, `Unknown fieldMarked.TYPE = '${f.TYPE}', mapped to 'varchar2(2000)'`);
            }
            return "string2000";
    }
};

// export const selectFieldOracleType = (f: DJiraFieldMarkedMeta): string => {
//     switch (f.ISSUE_LOADER_TYPE) {
//         case "string100":
//             return "varchar2(40)";
//         case "string255":
//             return "varchar2(255)";
//         case "integer":
//             return "number";
//         case "number":
//             return "number";
//         case "date":
//             return "date";
//         case "datetime":
//             return "timestamp";
//         case "dwh_flag":
//             return "varchar2(1)";
//         case "json":
//             return "clob";

//         default:
//             assertNever(f.ISSUE_LOADER_TYPE);
//             yconsole.error(
//                 `CODE00000004`,
//                 `Internal error - should be unreachable. Couldn't deduce oracle type for ${f.ISSUE_LOADER_TYPE}. Using varchar2(255)`
//             );
//             return "varchar2(255)";
//     }
// };

export const enrichAndValidateDJiraFieldMarked = (r: any): DJiraFieldMarkedMeta => {
    for (let k in r) if (r[k] === null) r[k] = undefined;

    r.LOAD = r.LOAD_FLAG === "Y";
    r.LOAD_ALG = "null";
    r.ISSUE_LOADER_TYPE = "string255";

    decoderDJiraFieldMarkedMeta.runWithException(r);

    r.LOAD_ALG = r.LOAD_ALG_OVERRIDE || selectFieldAlg(r);
    if (isIncludedFieldAlg(r)) {
        r.ISSUE_LOADER_TYPE = r.ISSUE_LOADER_TYPE_OVERRIDE || selectFieldType(r);
    }

    decoderDJiraFieldMarkedMeta.runWithException(r);
    return r;
};

export const readDJiraFieldMarkedMeta = async function(
    db: OracleConnection0,
    tableName: string,
    allow_update: boolean,
    debugfm?: boolean
): Promise<DJiraFieldMarkedMeta[]> {
    const sql = `SELECT * from ${tableName} where ${
        !debugfm ? `load_flag = 'Y' and` : ""
    } deleted_flag <> 'Y' and length(target_name) > 0`;

    let result = await db.execute(sql, []);
    if (!result.rows || !result.rows.length) {
        if (allow_update) {
            await db.execute(`update ${tableName} set target_name = ID, load_flag = case when 
            custom_id is null and not(type in ('array'))
            then 'Y' else 'N' end
            where target_name is null and load_flag = 'N'`);
            /*
            await db.execute(`update ${tableName} set target_name = ID, load_flag = case when 
            custom_id is null and not(type in ('array'))
            then 'Y' else 'N' end
            where target_name is null and load_flag = 'N' and not exists (select 1 c from  ${tableName} where target_name is not null and load_flag = 'Y')
            `);
             */

            result = await db.execute(sql, []);
        }

        if (!result.rows || !result.rows.length)
            throw new Error(
                `CODE00000005 Oracle haven't returned result for "${sql}" - Jira is unreachable or some internal error.`
            );
    }

    if (debugfm)
        for (let r of result.rows as any) {
            r.TARGET_NAME = r.ID;
            r.LOAD_FLAG = "Y";
        }

    const allMarkedFields = result.rows.map(enrichAndValidateDJiraFieldMarked);
    for (let f of allMarkedFields.filter(isExcludedFieldAlg))
        yconsole.warn(
            `CODE00000006`,
            `Algorithm for ${f.ID} (${f.TARGET_NAME}, '${f.NAME}') is '${f.LOAD_ALG}' - it will not be loaded. Fix code in issue_loader or use LOAD_ALG_OVERRIDE`
        );

    const markedFields = allMarkedFields.filter(isIncludedFieldAlg);
    if (!markedFields.length)
        throw new Error(`CODE00000007 No marked fields exist inside '${tableName}' - aborting all operaions.`);
    return markedFields;
};
