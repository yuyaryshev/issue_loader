import { DbDomainInput, DbDomFieldInput } from "./dbDomain";
import { JiraComment } from "Yjira";

// export interface JiraComment {
//     self: JiraUrl;
//     id: JiraNumId;
//     author: JiraUser;
//     updateAuthor: JiraUser;
//     body: string;
//     created: JiraDateTime;
//     updated: JiraDateTime;
// }

export interface DCommentItem {
    ISSUEKEY: string;
    ID: string;
    AUTHOR: string;
    UPDATEAUTHOR: string;
    BODY: string; // "yya time spent 1",
    CREATED: string; // "2019-11-07T12:40:10.000+0300",
    UPDATED: string; // "2019-11-07T12:40:10.000+0300",
}

export function dcommentFromJira(issueKey: string, a: JiraComment): DCommentItem {
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
