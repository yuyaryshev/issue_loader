import { DbDomFieldInput } from "./dbDomain";

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
    ID: string;
    AUTHOR: string;
    UPDATEAUTHOR: string;
    BODY: string; // "yya time spent 1",
    CREATED: string; // "2019-11-07T12:40:10.000+0300",
    UPDATED: string; // "2019-11-07T12:40:10.000+0300",
}

export const dbdDCommentItemInput = {
    name: "JIRA_WORKLOG",
    table: "JIRA_WORKLOG",
    changesTable: "JIRA_WORKLOG_CHANGES",
    handlerStoredProc: "HANDLE_JIRA_WORKLOG_CHANGES",
    fields: [
        { name: "ID", type: "string40", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "AUTHOR", type: "string40", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "UPDATEAUTHOR", type: "string40", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "BODY", type: "string4000", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "CREATED", type: "datetime", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "UPDATED", type: "datetime", nullable: false, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[]
};
