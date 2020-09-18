import { DbDomainInput, DbDomFieldInput } from "./dbDomain";

export interface DFieldsInheritanceItem {
    ISSUEKEY: string;
    PARENT_ISSUEKEY: string;
    STATUS: string;
}

export const dbdDFieldsInheritanceInput: DbDomainInput<any, any> = {
    name: "FIELDS_INHERITANCE_T",
    hasChangesTable: false,
    deleteByIssueKeyBeforeMerge: false,
    fields: [
        { name: "PROJECT", type: "string2000", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "ISSUETYPE", type: "string2000", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "FIELD", type: "string2000", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "OUTPUT_CODE", type: "string2000", nullable: false, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
