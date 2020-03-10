import { DbDomainInput, DbDomFieldInput } from "./dbDomain";

export interface DLabel {
    ISSUEKEY: string;
    FIELD: string;
    NAME: string;
}

export const dbdDLabelInput: DbDomainInput<DLabel, any> = {
    name: "LABEL_T",
    hasChangesTable: true,
    deleteByIssueKeyBeforeMerge: true,
    fields: [
        { name: "ISSUEKEY", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "FIELD", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "NAME", type: "string255", nullable: false, pk: true, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
