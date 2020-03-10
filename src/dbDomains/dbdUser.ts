import { DbDomainInput, DbDomFieldInput } from "./dbDomain";
import { JiraUser } from "Yjira";

export interface DUser {
    KEY: string;
    NAME: string;
    EMAIL: string;
    DISPLAY_NAME: string;
    ACTIVE: string; // boolean
    TIMEZONE_STR: string; // "Europe/Moscow"
    AVATAR_URLS: string; // JiraAvatarUrls;
}

export function duserFromJira(a: JiraUser): DUser {
    return {
        KEY: a.key,
        NAME: a.name,
        EMAIL: a.emailAddress,
        DISPLAY_NAME: a.displayName,
        ACTIVE: a.active ? "Y" : "N",
        TIMEZONE_STR: a.timeZone,
        AVATAR_URLS: JSON.stringify(a.avatarUrls),
    };
}

export const dbdDUserInput: DbDomainInput<DUser, JiraUser> = {
    name: "JIRA_USER_T",
    hasChangesTable: true,
    deleteByIssueKeyBeforeMerge: false,
    fields: [
        { name: "KEY", type: "string100", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "NAME", type: "string100", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "EMAIL", type: "string100", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "DISPLAY_NAME", type: "string255", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "ACTIVE", type: "dwh_flag", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "TIMEZONE_STR", type: "string100", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "SECONDSSPENT", type: "number", nullable: true, pk: false, insert: true } as DbDomFieldInput,
        { name: "AVATAR_URLS", type: "string2000", nullable: true, pk: false, insert: true } as DbDomFieldInput,
    ] as DbDomFieldInput[],
};
