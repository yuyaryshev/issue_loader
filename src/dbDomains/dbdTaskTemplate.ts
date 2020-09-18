import { DbDomainInput, DbDomFieldInput } from "./dbDomain";

export interface DTaskTemplateItem {
    ISSUETYPE: string;
    PROJECT: string;
    TEMPLATE_ISSUEKEY: string;
}

export const dbdDTaskTemplateInput: DbDomainInput<any, any> = {
    // TODO Доработать таблицу, взять все необходимые поля, пока что так
    name: "TASK_TEMPLATE_T",
    hasChangesTable: false,
    deleteByIssueKeyBeforeMerge: false,
    fields: [
        { name: "PROJECT", type: "string2000", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "ISSUETYPE", type: "string2000", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "LAYOUT_ID", type: "number", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "JIRAFIELD", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "VALUEOF_JIRAFIELD", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TEMPLATE_ISSUEKEY", type: "string100", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "GENERATED_FLAG", type: "dwh_flag", nullable: false, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
