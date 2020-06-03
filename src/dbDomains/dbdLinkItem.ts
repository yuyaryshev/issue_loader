import { JiraLinkItem, JiraLinkType } from "Yjira";
import { DbDomainInput, DbDomFieldInput } from "./dbDomain";
import { Env } from "../other/Env";

/*
 Тут лежат link и link_type
*/

export interface DLinkItem {
    ISSUEKEY: string;
    ID: string;
    INWARDISSUE?: string; //link on this(key) issue
    OUTWARDISSUE?: string;
    TYPEID: string;
    TS?: string;
    DELETED_FLAG?: string;
}

export function dlinkItemFromJira(issueKey: string, a: JiraLinkItem, TSinput: string, env: Env): DLinkItem {
    if (env.settings.write_into_log_tables) {
        return {
            ISSUEKEY: issueKey,
            ID: a.id,
            INWARDISSUE: a.inwardIssue?.key,
            OUTWARDISSUE: a.outwardIssue?.key,
            TYPEID: a.type.id,
            TS: TSinput + env.sequenceTS.nextValue(),
            DELETED_FLAG: "N",
        };
    } else {
        return {
            ISSUEKEY: issueKey,
            ID: a.id,
            INWARDISSUE: a.inwardIssue?.key,
            OUTWARDISSUE: a.outwardIssue?.key,
            TYPEID: a.type.id,
        };
    }
}

export const dbdDLinkItemInput: DbDomainInput<DLinkItem, JiraLinkItem> = {
    // TODO Доработать таблицу, взять все необходимые поля, пока что так
    name: "LINK_T",
    hasChangesTable: true,
    deleteByIssueKeyBeforeMerge: true,
    fields: [
        { name: "ISSUEKEY", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "ID", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "INWARDISSUE", type: "string100", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "OUTWARDISSUE", type: "string100", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TYPEID", type: "string100", nullable: true, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};

export const dbdDLinkItemInputLog: DbDomainInput<DLinkItem, JiraLinkItem> = {
    // TODO Доработать таблицу, взять все необходимые поля, пока что так
    name: "LINK_T_LOG",
    hasChangesTable: false,
    deleteByIssueKeyBeforeMerge: false,
    fields: [
        { name: "ISSUEKEY", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "ID", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "INWARDISSUE", type: "string100", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "OUTWARDISSUE", type: "string100", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TYPEID", type: "string100", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TS", type: "string40", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "DELETED_FLAG", type: "dwh_flag", nullable: false, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};

// link type format
export interface DLinkType {
    ID: string; // 10075
    INWARD?: string | undefined; // is blocked by
    NAME: string; // Blocks
    OUTWARD?: string | undefined; // blocks
}

export interface JiraissueLinkType {
    id: string; // 10075
    inward?: string | undefined; // is blocked by
    name: string; // Blocks
    outward?: string | undefined; // blocks
    self: string;
}

export interface DLinkTypeOld {
    issueLinkTypes: JiraissueLinkType[];
}

export interface DLinkTypeMetas {
    [key: string]: DLinkType;
}

export const jiraGetAllLinkTypeMetas = async (env: Env) => {
    // LOADING ALL LINK TYPES
    var options = {
        uri: env.jira.jira.buildURL("/issueLinkType"),
        method: "GET",
        json: true,
        followAllRedirects: true,
    };

    // GET /rest/api/2/issueLinkType

    let allTypes0: DLinkTypeOld = await env.jira.jira.makeRequest(options);

    let allTypes: DLinkType[] = [];

    allTypes0.issueLinkTypes.forEach(element => {
        allTypes.push({ ID: element.id, INWARD: element.inward, NAME: element.name, OUTWARD: element.outward });
    });

    /*
    // нужна ли такая обработка?)

    const allTypes = {} as DLinkTypeMetas;
    for (let field of allTypes0) {
        const jiraFieldMeta = {
            ID: field.id,
            INWARD: field.name,
            NAME: field.name,
            OUTWARD: field.name,
        };
        
        try {
            decoderValidateFieldMeta.runWithException(jiraFieldMeta);
        } catch (e) {
            yconsole.error(
                `CODE00000202`,
                `Jira changed schema? Validation for message from jira failed. Failed to load field:\n ${JSON.stringify(
                    jiraFieldMeta,
                    undefined,
                    "    "
                )}\n\n`,
                e
            );
            continue;
        }
        
        allTypes[field.id] = jiraFieldMeta;
    }
    */
    return allTypes;
};

export const dbdDLinkTypeInput: DbDomainInput<DLinkItem, JiraLinkType> = {
    name: "LINK_TYPE_SDIM",
    hasChangesTable: true,
    deleteByIssueKeyBeforeMerge: false,
    fields: [
        { name: "ID", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "INWARD", type: "string100", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "NAME", type: "string100", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "OUTWARD", type: "string100", nullable: true, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
