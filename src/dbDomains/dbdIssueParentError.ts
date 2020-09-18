import { DbDomainInput, DbDomFieldInput } from "./dbDomain";

export interface DIssueErrorParentItem {
    ISSUEKEY: string;
    TS: string;
    DELETED_FLAG: string;
}

export const dbdDIssueErrorParentInput: DbDomainInput<any, any> = {
    // TODO Доработать таблицу, взять все необходимые поля, пока что так
    name: "ISSUE_ERROR_PARENT_T_LOG",
    hasChangesTable: false,
    deleteByIssueKeyBeforeMerge: false,
    fields: [
        { name: "ISSUEKEY", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "TS", type: "string40", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "DELETED_FLAG", type: "dwh_flag", nullable: false, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
