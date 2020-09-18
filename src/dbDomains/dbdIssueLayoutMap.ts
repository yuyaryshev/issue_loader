import { DbDomainInput, DbDomFieldInput } from "./dbDomain";

export interface DIssueLayoutMapItem {
    LAYOUT_ID: number;
    ISSUETYPE: string;
    FIELD_ID: string;
    USE_CREATING: string;
}

export const dbdDIssueLayoutMapInput: DbDomainInput<any, any> = {
    name: "ISSUE_LAYOUT_MAP_T",
    hasChangesTable: false,
    deleteByIssueKeyBeforeMerge: false,
    fields: [
        { name: "LAYOUT_ID", type: "number", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "ISSUETYPE", type: "string2000", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "FIELD_ID", type: "string2000", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "USE_CREATING", type: "dwh_flag", nullable: false, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
