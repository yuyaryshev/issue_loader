import { KVCache, KVCacheUpsert, KVCacheSet } from "./kvCache";
import JiraClient from "jira-connector";
import { mockableRequest } from "./mockableRequest";
import { EnvSettings } from "./startEnv";
import { yconsole } from "./consoleMsg";
import { async } from "q";

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

export interface DJiraFields {
    resolution: null; // TODO what here?
    lastViewed: JiraDateTime;
    aggregatetimeoriginalestimate: number;
    issuelinks: []; // TODO what here?
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
    create: JiraDateTime;
    items: JiraHistoryItem[];
}

export interface JiraChangeLog {
    startAt: number; // 0
    maxResults: number; // 13
    total: number; // 13
    histories: JiraHistory[];
}

export interface JiraIssue {
    expand: string;
    id: JiraNumId;
    self: JiraUrl;
    key: string;
    fields: DJiraFields;
    changelog: JiraChangeLog;
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

export interface GetIssueRequest {
    issueKey: string;
    expand?: string[];
}

export interface SearchRequest extends JiraPaginatedRequest {
    jql: string;
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

export class JiraWrapper {
    jira: any;
    envSettings: EnvSettings;
    requestsCache: KVCache;
    maxResults: number;

    constructor(settings: EnvSettings, requestsCache: KVCache) {
        this.envSettings = settings;
        this.requestsCache = requestsCache;
        this.maxResults = settings.jiraMaxResults;
        this.jira = new JiraClient(!settings.connect_jira_dev ? settings.jira : settings.jiradev!);
    }

    async getAllFields(): Promise<JiraField[]> {
        const pthis = this;
        return KVCacheUpsert(this.requestsCache, "jira.field.getAllFields", () => pthis.jira.field.getAllFields());
    }

    async getServerInfo(): Promise<JiraServerInfo> {
        // HINT: НЕЛЬЗЯ не кешировать в requestsCache только этот вид запроса, потому что если так сделать,
        // то дата в базе будет обновляться - ведь она берется настоящая,
        // а вот изменения приходить - ведь ответы на другие запросы берутся из кеша.
        const pthis = this;
        return KVCacheUpsert(this.requestsCache, "jira.serverInfo.getServerInfo", () =>
            pthis.jira.serverInfo.getServerInfo({})
        );
    }

    async getIssue(getIssueRequest: GetIssueRequest): Promise<JiraIssue> {
        const pthis = this;
        return KVCacheUpsert(this.requestsCache, "jira.issue.getIssue/" + getIssueRequest.issueKey, () =>
            pthis.jira.issue.getIssue(getIssueRequest)
        );
    }

    async addIfPaginated<T>(
        target: any,
        restApiCall: (opts: any) => Promise<JiraPagination>,
        arrayFieldInResponse?: string,
        consoleHint: string = "",
        opts: any = {}
    ): Promise<T> {
        const pthis = this;
        if (!arrayFieldInResponse)
            for (let k in target)
                if (Array.isArray(k)) {
                    if (!arrayFieldInResponse) arrayFieldInResponse = k;
                    else throw new Error(`T9023 Ambigious field in paginated request - need to fix typescript code.`);
                }

        // TODO нет тут ни changelog ни worklog
        if (!arrayFieldInResponse || !target || !(target as any)[arrayFieldInResponse]) return (target as any) as T;
        let total = target.total;
        const a = (target as any)[arrayFieldInResponse];
        let paginationCurrent = a.length;
        let startAt = paginationCurrent;
        if (startAt >= total) return (target as any) as T;

        yconsole.log(
            `T8891`,
            `INFO Fetching paginated data '${consoleHint}' ${paginationCurrent} of ${total} - progress`
        );

        const promises: Promise<any>[] = [];
        while (startAt < total) {
            promises.push(
                (async function() {
                    let rr = await restApiCall(Object.assign({ startAt, maxResults: pthis.maxResults }, opts));
                    paginationCurrent += (target as any)[arrayFieldInResponse].length;
                    yconsole.log(
                        `T8892`,
                        `INFO Fetching paginated data '${consoleHint}' ${paginationCurrent} of ${total} - progress`
                    );
                    return rr;
                })()
            );
            startAt += pthis.maxResults;
        }
        let results: any[] = [];
        for (let p of promises) results.push(await p);

        a.concat(...results);
        yconsole.log(`T8893`, `INFO Fetching paginated data '${consoleHint}' - FINISHED`);
        return (target as any) as T;
    }

    async fetchAllPagination<T>(
        restApiCall: (opts: any) => Promise<JiraPagination>,
        arrayFieldInResponse?: string,
        consoleHint: string = "",
        opts: any = {}
    ): Promise<T> {
        let target = await restApiCall(Object.assign({ startAt: 0, maxResults: this.maxResults }, opts));
        this.addIfPaginated(target, restApiCall, arrayFieldInResponse, consoleHint, opts);
        return (target as any) as T;
    }

    // Скачивает одну страницу Issue, причем в этих Isses - worklog и changelog могут быть загружены лишь частично
    async searchOnePageNoFields(query: SearchRequest): Promise<JiraIssues> {
        const pthis = this;
        const keyPrefix = "env.jira.search/" + query.jql + "/";
        return KVCacheUpsert(pthis.requestsCache, keyPrefix + (query.startAt || 0), () =>
            pthis.jira.search.search(query)
        );
    }

    // Скачивает одну страницу Issue, загружает ПОЛНОСТЬЮ поля worklog и changelog
    async searchOnePageWithFields(query: SearchRequest): Promise<JiraIssues> {
        const pthis = this;
        const keyPrefix = "env.jira.search/" + query.jql + "/worklogs";
        return (async function() {
            let promises: Promise<void>[] = [];
            const r = await pthis.searchOnePageNoFields(query);
            for (let issue of r.issues) {
                promises.push(
                    pthis.addIfPaginated(
                        issue.fields.worklog,
                        function(opts: any) {
                            return pthis.jira.issue(issue.id).worklog(opts);
                        },
                        "worklogs",
                        keyPrefix
                    )
                );
                promises.push(
                    pthis.addIfPaginated(
                        issue.changelog,
                        function(opts: any) {
                            return pthis.jira.issue(issue.id).changelog(opts);
                        },
                        "changelogs",
                        keyPrefix
                    )
                );
            }
            await Promise.all(promises);
            return r;
        })();
    }

    // В цикле обрабатывает весь набора Issue, worklog и changelog - полные
    async search(
        query: SearchRequest,
        callback: (index: number, startAt: number, responsePromise: Promise<JiraIssues>) => Promise<void>
    ): Promise<void> {
        let responsePromise = this.searchOnePageWithFields(query);
        const promises: Promise<void>[] = [callback(0, 0, responsePromise)];
        let r = await responsePromise;

        if (r.issues)
            for (let i = 1; i * this.maxResults < r.total; i++)
                promises.push(
                    callback(
                        i, i * this.maxResults,
                        this.searchOnePageWithFields(Object.assign({}, query, { startAt: i * this.maxResults }))
                    )
                );

        return Promise.all(promises) as Promise<any>;
    }
}
