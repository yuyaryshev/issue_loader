import { JiraChangeLog } from "Yjira";
import { DbDomainInput, DbDomFieldInput } from "./dbDomain";
import { Env } from "other";

export interface DChangelogItem {
    ISSUEKEY: string;
    FIELD: string;
    AUTHOR: string;
    ID: string;
    TS_CREATED: string;

    FIELDTYPE: string;
    FROM_V: string | undefined;
    FROM_STRING: string | undefined;
    TO_V: string | undefined;
    TO_STRING: string | undefined;
    TS?: string;
    DELETED_FLAG?: string;
}

export function dchangeLogFromJira(
    issueKey: string,
    jiraChangeLog: JiraChangeLog,
    TSinput: string,
    env: Env
): DChangelogItem[] {
    let r: DChangelogItem[] = [];
    if (jiraChangeLog && jiraChangeLog.histories) {
        if (env.settings.write_into_log_tables) {
            for (let history of jiraChangeLog.histories) {
                for (let a of history.items) {
                    r.push({
                        ISSUEKEY: issueKey,
                        ID: history.id,
                        AUTHOR: history.author.key,
                        TS_CREATED: history.created,
                        FIELD: a.field,
                        FIELDTYPE: a.fieldtype,
                        FROM_V: a.from,
                        FROM_STRING: a.fromString,
                        TO_V: a.to,
                        TO_STRING: typeof a.toString === "string" ? a.toString : ((undefined as any) as string),
                        TS: TSinput + env.sequenceTS.nextValue(),
                        DELETED_FLAG: "N",
                    });
                }
            }
        } else {
            for (let history of jiraChangeLog.histories) {
                for (let a of history.items) {
                    r.push({
                        ISSUEKEY: issueKey,
                        ID: history.id,
                        AUTHOR: history.author.key,
                        TS_CREATED: history.created,
                        FIELD: a.field,
                        FIELDTYPE: a.fieldtype,
                        FROM_V: a.from,
                        FROM_STRING: a.fromString,
                        TO_V: a.to,
                        TO_STRING: typeof a.toString === "string" ? a.toString : ((undefined as any) as string),
                    });
                }
            }
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
        { name: "TS_CREATED", type: "string40", nullable: false, pk: true, insert: true } as DbDomFieldInput,

        { name: "FIELDTYPE", type: "string255", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "FROM_V", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "FROM_STRING", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TO_V", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TO_STRING", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};

export const dbdDChangeLogItemInputLog: DbDomainInput<DChangelogItem, undefined> = {
    name: "CHANGELOG_T_LOG",
    hasChangesTable: false,
    deleteByIssueKeyBeforeMerge: false,
    fields: [
        { name: "ISSUEKEY", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "FIELD", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "AUTHOR", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "ID", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "TS_CREATED", type: "string40", nullable: false, pk: false, insert: true } as DbDomFieldInput,

        { name: "FIELDTYPE", type: "string255", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "FROM_V", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "FROM_STRING", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TO_V", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TO_STRING", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TS", type: "string40", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "DELETED_FLAG", type: "dwh_flag", nullable: false, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
