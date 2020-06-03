import { DbDomainInput, DbDomFieldInput } from "./dbDomain";

export interface DLabel {
    ISSUEKEY: string;
    FIELD: string;
    NAME: string;
    TS?: string;
    DELETED_FLAG?: string;
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

export const dbdDLabelInputLog: DbDomainInput<DLabel, any> = {
    name: "LABEL_T_LOG",
    hasChangesTable: false,
    deleteByIssueKeyBeforeMerge: false,
    fields: [
        { name: "ISSUEKEY", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "FIELD", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "NAME", type: "string255", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "TS", type: "string40", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "DELETED_FLAG", type: "dwh_flag", nullable: false, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
