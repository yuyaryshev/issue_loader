import { DbDomainInput, DbDomFieldInput } from "./dbDomain";

export interface DIssueChildsItem {
    ISSUEKEY: string;
    PARENT_ISSUEKEY: string;
    STATUS: string;
}

export const dbdDIssueChildsInput: DbDomainInput<any, any> = {
    name: "ISSUE_CHILDS_T_LOG",
    hasChangesTable: false,
    deleteByIssueKeyBeforeMerge: false,
    fields: [
        { name: "ISSUEKEY", type: "string2000", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "PARENT_ISSUEKEY", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "STATUS", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
