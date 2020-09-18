import { DbDomainInput, DbDomFieldInput } from "./dbDomain";

export interface DFieldConfigurationItem {
    ISSUETYPE: string;
    PROJECT: string;
    TEMPLATE_ISSUEKEY: string;
}

export const dbdDFieldConfigurationInput: DbDomainInput<any, any> = {
    name: "FIELD_CONFIGURATION_T",
    hasChangesTable: false,
    deleteByIssueKeyBeforeMerge: false,
    fields: [
        { name: "FIELD_ID", type: "number", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "FIELD_NAME", type: "string2000", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "OUTPUT_CODE", type: "string2000", nullable: false, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
