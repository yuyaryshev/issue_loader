import { JiraChangeLog } from "./JiraWrapper";
import { DbDomFieldInput } from "./dbDomain";

// export interface JiraHistoryItem {
//     field: string; // "status",
//     fieldtype: string; // : "jira",
//     from: string; // : "3",
//     fromString: string; // : "In Progress",
//     to: string; // : "10106",
//     toString: string; // : "TO DO"
// }

// export interface JiraHistory {
//     id: JiraNumId;
//     author: JiraUser;
//     create: JiraDateTime;
//     items: JiraHistoryItem[];
// }

// export interface JiraChangeLog {
//     startAt: number; // 0
//     maxResults: number; // 13
//     total: number; // 13
//     histories: JiraHistory[];
// }

export interface DChangelogItem {
    ID: string;
    AUTHOR: string;
    TS: string; // "2019-11-07T12:40:10.000+0300",

    FIELD: string;
    FIELDTYPE: string;
    FROM_V: string;
    FROM_STRING: string;
    TO_V: string;
    TO_STRING: string;
}

export function dchangeLogFromJira(jiraChangeLog: JiraChangeLog): DChangelogItem[] {
    let r: DChangelogItem[] = [];
    for (let history of jiraChangeLog.histories) {
        for (let a of history.items) {
            r.push({
                ID: history.id,
                AUTHOR: history.author.key,
                TS: history.create,
                FIELD: a.field,
                FIELDTYPE: a.fieldtype,
                FROM_V: a.from,
                FROM_STRING: a.fromString,
                TO_V: a.to,
                TO_STRING: a["toString"]
            });
        }
    }
    return r;
}

export const dbdDChangelogItemInput = {
    name: "JIRA_CHANGELOG",
    table: "JIRA_CHANGELOG",
    changesTable: "JIRA_CHANGELOG_CHANGES",
    handlerStoredProc: "HANDLE_JIRA_CHANGELOG_CHANGES",
    fields: [
        { name: "ID", type: "string40", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "AUTHOR", type: "string40", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "TS", type: "datetime", nullable: false, pk: false, insert: true } as DbDomFieldInput,

        { name: "FIELD", type: "string40", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "FIELDTYPE", type: "string255", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "FROM_V", type: "string4000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "FROM_STRING", type: "string4000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TO_V", type: "string4000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TO_STRING", type: "string4000", nullable: true, pk: false, insert: true } as DbDomFieldInput
    ] as DbDomFieldInput[]
};
