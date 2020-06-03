import { DbDomainInput, DbDomFieldInput } from "./dbDomain";
import { JiraComment } from "Yjira";
import { Env } from "other";

export interface DCommentItem {
    ISSUEKEY: string;
    ID: string;
    AUTHOR: string;
    UPDATEAUTHOR: string;
    BODY: string; // "yya time spent 1",
    CREATED: string; // "2019-11-07T12:40:10.000+0300",
    UPDATED: string; // "2019-11-07T12:40:10.000+0300",
    TS?: string;
    DELETED_FLAG?: string;
}

export function dcommentFromJira(issueKey: string, a: JiraComment, TSinput: string, env: Env): DCommentItem {
    if (env.settings.write_into_log_tables) {
        return {
            ISSUEKEY: issueKey,
            ID: a.id,
            AUTHOR: a.author.key,
            UPDATEAUTHOR: a.updateAuthor.key,
            BODY: a.body, // "yya time spent 1",
            CREATED: a.created,
            UPDATED: a.updated,
            TS: TSinput + env.sequenceTS.nextValue(),
            DELETED_FLAG: "N",
        };
    } else {
        return {
            ISSUEKEY: issueKey,
            ID: a.id,
            AUTHOR: a.author.key,
            UPDATEAUTHOR: a.updateAuthor.key,
            BODY: a.body, // "yya time spent 1",
            CREATED: a.created,
            UPDATED: a.updated,
        };
    }
}

export const dbdDCommentItemInput: DbDomainInput<DCommentItem, JiraComment> = {
    name: "COMMENT_T",
    hasChangesTable: true,
    deleteByIssueKeyBeforeMerge: true,
    fields: [
        { name: "ISSUEKEY", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "ID", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "AUTHOR", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "UPDATEAUTHOR", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "BODY", type: "string2000", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "CREATED", type: "datetime", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "UPDATED", type: "datetime", nullable: false, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};

export const dbdDCommentItemInputLog: DbDomainInput<DCommentItem, JiraComment> = {
    name: "COMMENT_T_LOG",
    hasChangesTable: false,
    deleteByIssueKeyBeforeMerge: false,
    fields: [
        { name: "ISSUEKEY", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "ID", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "AUTHOR", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "UPDATEAUTHOR", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "BODY", type: "string2000", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "CREATED", type: "datetime", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "UPDATED", type: "datetime", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "TS", type: "string40", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "DELETED_FLAG", type: "dwh_flag", nullable: false, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
