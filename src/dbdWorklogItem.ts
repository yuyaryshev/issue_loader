import { JiraWorklogItem } from "./JiraWrapper";
import { DbDomFieldInput } from "./dbDomain";

export interface DWorklogItem {
    ISSUEID: string;
    ID: string;
    AUTHOR: string;
    UPDATEAUTHOR: string;
    COMMENT: string; // "yya time spent 1",
    CREATED: string; // "2019-11-07T12:40:10.000+0300",
    UPDATED: string; // "2019-11-07T12:40:10.000+0300",
    STARTED: string; // "2019-11-05T12:39:00.000+0300",
    SECONDSSPENT: number; // 10800,
}

export function dworklogLogItemFromJira(a: JiraWorklogItem): DWorklogItem {
    return {
        ISSUEID: a.issueId,
        ID: a.id,
        AUTHOR: a.author.key,
        UPDATEAUTHOR: a.updateAuthor.key,
        COMMENT: a.comment,
        CREATED: a.created,
        UPDATED: a.updated,
        STARTED: a.started,
        SECONDSSPENT: a.timeSpentSeconds
    };
}

export const dbdDWorklogItemInput = {
    name: "JIRA_WORKLOG",
    table: "JIRA_WORKLOG",
    changesTable: "JIRA_WORKLOG_CHANGES",
    handlerStoredProc: "HANDLE_JIRA_WORKLOG_CHANGES",
    fields: [
        { name: "ISSUEID", type: "string40", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "ID", type: "string40", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "AUTHOR", type: "string40", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "UPDATEAUTHOR", type: "string40", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "COMMENT", type: "string4000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "CREATED", type: "datetime", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "UPDATED", type: "datetime", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "STARTED", type: "datetime", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "SECONDSSPENT", type: "number", nullable: true, pk: false, insert: true } as DbDomFieldInput
    ] as DbDomFieldInput[]
};
