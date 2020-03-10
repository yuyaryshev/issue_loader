import { JiraWorklogItem } from "Yjira";
import { DbDomainInput, DbDomFieldInput } from "./dbDomain";

export interface DWorklogItem {
    ISSUEKEY: string;
    ID: string;
    AUTHOR: string;
    UPDATEAUTHOR: string;
    TEXT: string; // "yya time spent 1",
    CREATED: string; // "2019-11-07T12:40:10.000+0300",
    UPDATED: string; // "2019-11-07T12:40:10.000+0300",
    STARTED: string; // "2019-11-05T12:39:00.000+0300",
    SECONDSSPENT: number; // 10800,
}

export function dworklogLogItemFromJira(issueKey: string, a: JiraWorklogItem): DWorklogItem {
    return {
        ISSUEKEY: issueKey,
        ID: a.id,
        AUTHOR: a.author.key,
        UPDATEAUTHOR: a.updateAuthor.key,
        TEXT: a.comment,
        CREATED: a.created,
        UPDATED: a.updated,
        STARTED: a.started,
        SECONDSSPENT: a.timeSpentSeconds,
    };
}

export const dbdDWorklogItemInput: DbDomainInput<DWorklogItem, JiraWorklogItem> = {
    name: "WORKLOG_T",
    hasChangesTable: true,
    deleteByIssueKeyBeforeMerge: true,
    fields: [
        { name: "ISSUEKEY", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "ID", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "AUTHOR", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "UPDATEAUTHOR", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "TEXT", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "CREATED", type: "datetime", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "UPDATED", type: "datetime", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "STARTED", type: "datetime", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "SECONDSSPENT", type: "number", nullable: true, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
