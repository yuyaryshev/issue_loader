import { JiraChangeLog } from "Yjira";
import { DbDomainInput, DbDomFieldInput } from "./dbDomain";

export interface DChangelogItem {
    ISSUEKEY: string;
    FIELD: string;
    AUTHOR: string;
    ID: string;
    TS: string;

    FIELDTYPE: string;
    FROM_V: string | undefined;
    FROM_STRING: string | undefined;
    TO_V: string | undefined;
    TO_STRING: string | undefined;
}

export function dchangeLogFromJira(issueKey: string, jiraChangeLog: JiraChangeLog): DChangelogItem[] {
    let r: DChangelogItem[] = [];
    if (jiraChangeLog && jiraChangeLog.histories)
        for (let history of jiraChangeLog.histories) {
            for (let a of history.items) {
                r.push({
                    ISSUEKEY: issueKey,
                    ID: history.id,
                    AUTHOR: history.author.key,
                    TS: history.created,
                    FIELD: a.field,
                    FIELDTYPE: a.fieldtype,
                    FROM_V: a.from,
                    FROM_STRING: a.fromString,
                    TO_V: a.to,
                    TO_STRING: typeof a.toString === "string" ? a.toString : ((undefined as any) as string),
                });
            }
        }
    return r;
}

export const dbdDChangelogItemInput: DbDomainInput<DChangelogItem, undefined> = {
    name: "CHANGELOG_T",
    hasChangesTable: true,
    deleteByIssueKeyBeforeMerge: true,
    fields: [
        { name: "ISSUEKEY", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "FIELD", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "AUTHOR", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "ID", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "TS", type: "datetime", nullable: false, pk: false, insert: true } as DbDomFieldInput,

        { name: "FIELDTYPE", type: "string255", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "FROM_V", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "FROM_STRING", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TO_V", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TO_STRING", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
