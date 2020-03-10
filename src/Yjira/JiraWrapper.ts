import { PermanentVaultObject } from "../YpermanentVault/PermanentVault";
import { YSemaphore, ysemaphore } from "../Ystd/ymutex";
import JiraClient from "jira-connector";
import { EnvSettings } from "../other/Env";
import moment from "moment";

export type JiraUrl = string; // "2019-11-07T12:40:10.000+0300",
export type JiraDateTime = string; // "2019-11-07T12:40:10.000+0300",
export type JiraDate = string; // "2019-11-07",
export type JiraTimeInterval = string; // "3w 2d"
export type JiraEmail = string; // "YYaryshev@alfabank.ru"
export type JiraNumId = string; // "755131"
export type JiraExpand = string; // "operations,versionedRepresentations,editmeta,changelog,renderedFields"

export interface JiraPagination {
    startAt: number; // 0,
    maxResults: number; // 20
    total: number; // 3
}

export interface JiraAvatarUrls {
    "16x16": JiraUrl;
    "24x24": JiraUrl;
    "32x32": JiraUrl;
    "48x48": JiraUrl;
}

export interface JiraUser {
    self: JiraUrl; // "http://jiraft.moscow.alfaintra.net/rest/api/2/issue/755131/worklog/235113",
    name: string; // "U_M12YK",
    key: string; // u_m12yk",
    emailAddress: JiraEmail;
    avatarUrls: JiraAvatarUrls;
    displayName: string; // "Ярышев Юрий Александрович",
    active: boolean;
    timeZone: string; // "Europe/Moscow"
}

export interface JiraWorklogItem {
    self: JiraUrl; // "http://jiraft.moscow.alfaintra.net/rest/api/2/issue/755131/worklog/235113",
    author: JiraUser;
    updateAuthor: JiraUser;
    comment: string; // "yya time spent 1",
    created: JiraDateTime; // "2019-11-07T12:40:10.000+0300",
    updated: JiraDateTime; // "2019-11-07T12:40:10.000+0300",
    started: JiraDateTime; // "2019-11-05T12:39:00.000+0300",
    timeSpent: JiraTimeInterval; // "3h",
    timeSpentSeconds: number; // 10800,
    id: JiraNumId;
    issueId: JiraNumId;
}

export interface JiraComment {
    self: JiraUrl;
    id: JiraNumId;
    author: JiraUser;
    updateAuthor: JiraUser;
    body: string;
    created: JiraDateTime;
    updated: JiraDateTime;
}

export interface JiraStatusCategory {
    self: JiraUrl;
    id: number; // 2,
    key: string; // "new",
    colorName: string; // "blue-gray",
    name: string; // "To Do"
}

export interface JiraStatus {
    self: JiraUrl;
    description: string;
    iconUrl: JiraUrl;
    name: string;
    id: JiraNumId;
    statusCategory: JiraStatusCategory;
}

export interface JiraIssueType {
    self: JiraUrl;
    id: JiraNumId;
    description: string;
    iconUrl: JiraUrl;
    name: string;
    subtask: boolean;
    avatarId: number;
}

export interface JiraTimeTrackingAgg {
    originalEstimate: JiraTimeInterval;
    remainingEstimate: JiraTimeInterval;
    timeSpent: JiraTimeInterval;
    originalEstimateSeconds: number;
    remainingEstimateSeconds: number;
    timeSpentSeconds: number;
}

export type JiraLabels = string[];

export interface JiraComment {
    self: JiraUrl;
    id: JiraNumId;
    author: JiraUser;
    body: string;
    updateAuthor: JiraUser;
    created: JiraDateTime;
    updated: JiraDateTime;
}

export interface JiraProgress {
    progress: number;
    total: number;
    percent: number;
}

export interface LinkInwardIssue {
    // TODO пока передаем простоту
    id: string;
    key: string;
}

export interface LinkOutwardIssue {
    // TODO пока передаем простоту
    id: string;
    key: string;
}

export interface LinkType {
    // TODO пока передаем простоту
    id: string;
}

export interface JiraLinkType {
    ID: string;
    INWARD?: string | undefined;
    NAME: string;
    OUTWARD?: string | undefined;
}

export interface JiraLinkItem {
    // TODO пока передаем простоту
    id: string;
    inwardIssue?: LinkInwardIssue;
    outwardIssue?: LinkOutwardIssue;
    type: LinkType;
}

export interface DJiraFields {
    resolution: null; // TODO what here?
    lastViewed: JiraDateTime;
    aggregatetimeoriginalestimate: number;
    issuelinks: JiraLinkItem[]; // TODO what here?
    subtasks: []; // TODO what here?
    issuetype: JiraIssueType;
    timetracking: JiraTimeTrackingAgg;
    environment: null; // TODO what here?
    timeestimate: number;
    aggregatetimespent: number;
    workratio: number;
    labels: JiraLabels;
    reporter: JiraUser;
    watches: {
        self: JiraUrl;
        watchCount: number;
        isWatching: boolean;
    };
    updated: JiraDateTime;
    timeoriginalestimate: number;
    description: string;
    fixVersions: []; // TODO what here?
    priority: {
        self: JiraUrl;
        iconUrl: JiraUrl;
        name: string;
        id: JiraNumId;
    };
    created: JiraDateTime;
    attachment: []; // TODO what here?
    assignee: JiraUser;
    votes: {
        self: JiraUrl;
        votes: number;
        hasVoted: boolean;
    };
    worklog: JiraPagination & {
        worklogs: JiraWorklogItem[];
    };
    duedate: JiraDate | null;
    status: JiraStatus;
    aggregatetimeestimate: number;
    creator: JiraUser;
    timespent: number;
    components: []; // TODO what here?
    progress: JiraProgress;
    project: {
        self: JiraUrl;
        id: string;
        key: string;
        name: string;
        avatarUrls: JiraAvatarUrls;
    };
    resolutiondate: JiraDateTime | null;
    summary: string;
    comment: JiraPagination & {
        comments: JiraComment[];
    };
    versions: []; // TODO what here?
    aggregateprogress: JiraProgress;
    customfield_10376: string; //link on epic->task
}

export interface DJiraFieldsAndCustomFields extends DJiraFields {
    [key: string]: any;
}

export interface JiraHistoryItem {
    field: string; // "status",
    fieldtype: string; // : "jira",
    from: string; // : "3",
    fromString: string; // : "In Progress",
    to: string; // : "10106",
    toString: string; // : "TO DO"
}

export interface JiraHistory {
    id: JiraNumId;
    author: JiraUser;
    created: JiraDateTime;
    items: JiraHistoryItem[];
}

export interface JiraChangeLog {
    startAt: number; // пока не представляет интереса
    maxResults: number; // пока не представляет интереса
    total: number; // пока  не представляет интереса
    histories: JiraHistory[];
    ts: string; // пока не представляет интереса
}

export interface JiraIssue extends PermanentVaultObject {
    expand: string;
    id: JiraNumId;
    self: JiraUrl;
    key: string;
    fields: DJiraFields;
    changelog: JiraChangeLog;

    // Added fields!
    ts: string;
    type: "issue";
    issueId: string;
}

export interface JiraIssues extends JiraPagination {
    issues: JiraIssue[];
}

export interface JiraServerInfo {
    baseUrl: JiraUrl;
    version: string; // "7.12.3",
    versionNumbers: [number, number, number]; // [7, 12, 3]
    deploymentType: string;
    buildNumber: number; // 712004,
    buildDate: JiraDateTime; // "2018-10-12T00:00:00.000+0300",
    serverTime: JiraDateTime; //  "2019-11-07T13:30:30.169+0300",
    scmInfo: string; // "5ef91d760d7124da5ebec5c16a948a4a807698df",
    serverTitle: string; // "Alfa-bank Issue Tracker"
}

export interface JiraPaginatedRequest {
    maxResults?: number;
    startAt?: number;
}

export interface GetIssueRequest1 {
    issueKey: string;
    expand?: string[];
}

export interface GetIssueRequest2 {
    issueId: string;
    expand?: string[];
}

export type GetIssueRequest = GetIssueRequest1 | GetIssueRequest2;

export interface SearchRequest extends JiraPaginatedRequest {
    jql: string;
    fullLoad?: boolean;
    project?: string; // Used only for batching in full load
    expand?: string[];
}

export interface JiraField {
    id: string; // "customfield_20673",
    name: string; //"Наименование пространства промышленных дефектов",
    custom: boolean; // true,
    orderable: boolean; // true,
    navigable: boolean; // true,
    searchable: boolean; // true,
    clauseNames: string[]; // [ "cf[20673]", "Наименование пространства промышленных дефектов" ],
    schema?: {
        type: string; // "string",
        custom: string; // "com.atlassian.jira.plugin.system.customfieldtypes:textfield",
        customId: number; // 20673
    };
}

export interface AdditionalRequest {
    name1: string;
    name2: string;
    apiCall: (opts: any) => any;
}

export class JiraWrapper {
    jira: any;
    envSettings: EnvSettings;
    maxResults: number;
    ysemaphore: YSemaphore;

    constructor(settings: EnvSettings) {
        this.envSettings = settings;
        this.maxResults = settings.jiraMaxResults;
        this.jira = new JiraClient(!settings.connect_jira_dev ? settings.jira : settings.jiradev!);
        this.ysemaphore = ysemaphore(settings.jiraMaxConnections);
    }

    async fetchAllPages(jiraApiPath: string, prop: string, opts?: any) {
        const pthis = this;
        return pthis.ysemaphore.lock(async () => {
            const callJira = eval(`(opts)=>pthis.jira.${jiraApiPath}(opts)`);
            const r = await callJira(opts);

            if (!r[prop]) return [];
            while (r[prop].length < r.total) {
                const newOpts = { ...opts, startAt: r[prop].length };
                const r2 = await callJira(newOpts);
                r[prop].push(...r2[prop]);
            }
            return r[prop] || [];
        });
    }

    async getWorkLogs(issueId: string) {
        const pthis = this;
        return (await pthis.fetchAllPages(`issue.getWorkLogs`, `worklogs`, { issueId })) as JiraWorklogItem[];
    }

    async getComments(issueId: string) {
        const pthis = this;
        return (await pthis.fetchAllPages(`issue.getComments`, `comments`, { issueId })) as JiraComment[];
    }

    async getAllFields(): Promise<JiraField[]> {
        const pthis = this;
        return pthis.ysemaphore.lock(async () => {
            return await pthis.jira.field.getAllFields();
        });
    }

    async getServerInfo(): Promise<JiraServerInfo> {
        const pthis = this;
        return pthis.ysemaphore.lock(async () => {
            return await pthis.jira.serverInfo.getServerInfo({});
        });
    }

    async getIssueById(getIssueRequest: GetIssueRequest2): Promise<JiraIssue> {
        const pthis = this;
        return pthis.ysemaphore.lock(async () => {
            const ts = moment().format();
            const r = await pthis.jira.issue.getIssue(getIssueRequest);
            if (r) {
                r.ts = ts;
                r.type = "issue";
                r.issueId = r.id;
            }
            return r;
        });
    }

    async getIssueByKey(getIssueRequest: GetIssueRequest1): Promise<JiraIssue> {
        const pthis = this;
        return pthis.ysemaphore.lock(async () => {
            return await pthis.jira.issue.getIssue(getIssueRequest);
        });
    }

    // Находит максимальный номер issue в проекте. Нельзя использовать с JQL в котором несколько проектов - будет undefined behaviour
    async searchLastIssue(query0: SearchRequest): Promise<number | undefined> {
        const pthis = this;
        return pthis.ysemaphore.lock(async () => {
            const query = Object.assign({}, query0, {
                maxResults: 1,
                jql: query0.jql.toUpperCase().split("ORDER BY")[0] + " ORDER BY issuekey DESC",
            });
            if (query.fullLoad) delete query.fullLoad;

            let issuesList = await pthis.jira.search.search(query);
            if (issuesList) for (let issue of issuesList.issues) return Number(issue.key.split("-")[1]);
            return undefined;
        });
    }

    async jqlGetIssueIds(jql: string): Promise<string[]> {
        const pthis = this;
        return pthis.ysemaphore.lock(async () => {
            const maxResults = 1000;
            const issueIds: string[] = [];
            let anError: any = undefined;
            const r0 = await pthis.jira.search.search({ jql, startAt: 0, maxResults, fields: ["id"] });
            for (let issue of r0.issues) issueIds.push(issue.id);

            const promises: Promise<void>[] = [];
            if (r0 && r0.total > r0.issues.length) {
                for (let startAt = maxResults; startAt < r0.total; startAt += maxResults) {
                    promises.push(
                        (async function() {
                            try {
                                const r1 = await pthis.jira.search.search({ jql, maxResults, startAt, fields: ["id"] });
                                for (let issue of r1.issues) issueIds.push(issue.id);
                            } catch (e) {
                                anError = e;
                            }
                        })()
                    );
                }
            }

            for (let promise of promises) await promise;
            if (anError) throw new anError();
            return issueIds;
        });
    }
}

// const pthis = this;
// return pthis.ysemaphore.lock(async () => {
// });
