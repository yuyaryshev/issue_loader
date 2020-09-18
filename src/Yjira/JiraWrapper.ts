import { PermanentVaultObject } from "../YpermanentVault/PermanentVault";
import { YSemaphore, ysemaphore } from "../Ystd/ymutex";
import JiraClient from "jira-connector";
import moment from "moment";
import { IssueContextInput } from "../job/IssueContext";
import { Decoder, number, object } from "@mojotech/json-type-validation";
import { shortSelfOrsha256base64 } from "Ystd";
import sortKeys from "sort-keys";

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

export const decoderJiraPagination: Decoder<JiraPagination> = object({
    startAt: number(),
    maxResults: number(),
    total: number(),
});

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
    TS?: moment.Moment;
    DELETED_FLAG?: string;
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

export type GetIssueRequest = GetIssueRequest1;

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

export interface ResponseLogItem {
    tsStart: moment.Moment;
    tsEnd: moment.Moment;
    ms: number;
    type: string;
    error?: string;
}

export interface ResponseStatItem {
    c: number;
    errorsCount: number;
    maxMs: number;
    avgMs: number;
    minMs: number;
}

export interface ResponseStats {
    [key: string]: ResponseStatItem;
}

export interface JiraRequest {
    jiraApiPath: string;
    opts: any | undefined;
}

export function jiraRequestKey(jiraRequest: JiraRequest) {
    return jiraRequest.jiraApiPath + "/" + shortSelfOrsha256base64(JSON.stringify(sortKeys(jiraRequest.opts)), 200);
}

export type JiraRequestHandler = (
    key: string,
    jiraRequest: JiraRequest,
    stubGet?: JiraRequestHandler
) => Promise<any> | any;

export interface JiraStubInterface {
    get: JiraRequestHandler;
    save: (key: string, jiraRequest: JiraRequest, value: any) => Promise<void> | void;
}

export const defaultJiraWrapperSettings: JiraWrapperSettings = {
    jiraMaxResults: 1000,
    jiraStub: undefined,
    jiraMaxConnectionsTimeSpan: 1000,
    jiraMaxConnections: 100,
    credentials: undefined as any,
    console: console,
};

export interface JiraWrapperSettings {
    jiraMaxResults: number;
    jiraStub?: JiraStubInterface;
    jiraMaxConnectionsTimeSpan: number;
    jiraMaxConnections: number;
    credentials: any;
    console?: any;
}

export function jiraCleanInner(a: any, p: string) {
    if (!a[p]) {
        if (a[p] === null || a[p] === undefined) delete a[p];
        return;
    } else {
        if (!Array.isArray(a[p]) && typeof a[p] === "object") {
            delete a[p].self;
            delete a[p].expand;
            delete a[p].avatarUrls;
            delete a[p].customfield_20970;
        }

        if (Array.isArray(a[p]) || typeof a[p] === "object") {
            for (let k in a[p]) jiraCleanInner(a[p], k);
        }
    }
}

export function jiraClean(a: any) {
    jiraCleanInner({ a }, "a");
    return a;
}

export class JiraWrapper {
    jira: any;
    maxResults: number;
    ysemaphore: YSemaphore;
    responseLogs: ResponseLogItem[];
    maxResponseLogsMs: number;
    stub?: JiraStubInterface;

    constructor(settings0: JiraWrapperSettings) {
        const settings = Object.assign({}, defaultJiraWrapperSettings, settings0);
        this.maxResults = settings.jiraMaxResults;
        this.stub = settings.jiraStub;
        this.jira = new JiraClient(settings.credentials);
        this.ysemaphore = ysemaphore(settings.jiraMaxConnections, settings.jiraMaxConnectionsTimeSpan);
        this.responseLogs = [];
        this.maxResponseLogsMs = 20 * 1000;
    }

    responseStats(): ResponseStats {
        this.removeOldResponseLog();
        const firstMs = this.responseLogs[0]?.ms || 0;
        const r = { total: { c: 0, ms: firstMs, minMs: firstMs, maxMs: firstMs, errorsCount: 0 } } as any;

        for (let item of this.responseLogs) {
            if (!r[item.type])
                r[item.type] = {
                    c: 0,
                    ms: 0,
                };

            r.total.c++;
            r.total.errorsCount += item.error ? 1 : 0;
            r.total.ms += item.ms;
            if (r.total.minMs > item.ms) r.total.minMs = item.ms;
            if (r.total.maxMs < item.ms) r.total.maxMs = item.ms;

            r[item.type].c++;
            r[item.type].errorsCount += item.error ? 1 : 0;
            r[item.type].ms += item.ms;
            if (r[item.type].minMs > item.ms) r[item.type].minMs = item.ms;
            if (r[item.type].maxMs < item.ms) r[item.type].maxMs = item.ms;
        }

        for (let k in r) {
            r[k].avgMs = Math.round(r[k].ms / r[k].c / this.maxResponseLogsMs);
            delete r[k].ms;
        }
        return r;
    }

    addResponseLog(tsStart: moment.Moment, type: string, error: string | undefined) {
        const tsEnd = moment();
        this.responseLogs.push({ tsStart, tsEnd, type, ms: tsEnd.diff(tsStart, "ms"), error });
        this.removeOldResponseLog();
    }

    removeOldResponseLog() {
        const ts = moment();
        let n = 0;
        for (; n < this.responseLogs.length; n++)
            if (ts.diff(this.responseLogs[n].tsEnd) < this.maxResponseLogsMs) break;

        if (n > 0) this.responseLogs.splice(0, n);
    }

    async jiraRequest<T>(
        jiraApiPath: string,
        prop: string | undefined,
        opts: any | undefined,
        expectedFields: string[] | undefined,
        verificator: undefined | ((r: any) => void)
    ): Promise<T> {
        const pthis = this;
        return pthis.ysemaphore.lock(async () => {
            const tsStart = moment();
            let checked: boolean = true;
            let error: string | undefined;
            let response;
            let result;
            try {
                const callJira = eval(`(opts)=>pthis.jira.${jiraApiPath}(opts)`);
                const jiraRequest: JiraRequest = { jiraApiPath, opts };

                let key: string;
                if (this.stub) {
                    key = jiraRequestKey(jiraRequest);
                    response = await this.stub.get(key, jiraRequest);
                }

                if (!response) response = jiraClean(await callJira(opts || {}));

                if (!prop && (!expectedFields || !expectedFields.length) && !verificator) {
                    checked = false;
                    console.warn(`CODE00000029 Jira request without verificator`);
                    // If stopped here add any verificatior or props for this request.
                    debugger;
                }

                if (!response) throw new Error(`CODE00000030 Got empty response from Jira!`);

                if (expectedFields) {
                    for (let field of expectedFields)
                        if (!response[field])
                            throw new Error(`CODE00000031 Expected field ${field} not found in jira response!`);
                }

                if (verificator) {
                    checked = true;
                    verificator(response);
                }

                if (!prop) {
                    this.addResponseLog(tsStart, jiraApiPath, undefined);
                    result = response;
                } else {
                    checked = true;
                    if (!response[prop])
                        throw new Error(`CODE00000032 Got response from Jira, but it doesn't have ${prop} prop!`);

                    while (response[prop].length < response.total) {
                        const newOpts = { ...opts, startAt: response[prop].length };
                        const r2 = jiraClean(await callJira(newOpts));
                        response[prop].push(...r2[prop]);
                    }
                    this.addResponseLog(tsStart, jiraApiPath, undefined);
                    result = response[prop] || [];
                }

                if (checked && this.stub) await this.stub.save(key!, jiraRequest, response);

                return result;
            } catch (e) {
                if (!(e instanceof Error)) {
                    if (typeof e === "string") e = JSON.parse(e);
                    const ne: any = new Error(`CODE00000099 JiraWrapper error: ${JSON.stringify(e)}`);
                    ne.data = e;
                    ne.code = e.statusCode;
                    ne.statusCode = e.statusCode;
                    e = ne;
                }
                if ((e?.code + "").trim() === "429") {
                    e = new Error(`CODE00000366 Jira error 429 too many requests`);
                    e.code = 429;
                    e.statusCode = 429;
                }
                /*
                if ((e?.code + "").trim() === "404") {
                    e = new Error(`CODE00000367 Jira error ISSUE DOES NOT EXIST`);
                    e.code = 404;
                    e.statusCode = 404;
                }
                 */

                this.addResponseLog(tsStart, jiraApiPath, e.message);
                throw e;
            }
        });
    }

    async getWorkLogs(issueKey: string) {
        return this.jiraRequest<JiraWorklogItem[]>(`issue.getWorkLogs`, `worklogs`, { issueKey }, undefined, undefined);
    }

    async getComments(issueKey: string) {
        return this.jiraRequest<JiraComment[]>(`issue.getComments`, `comments`, { issueKey }, undefined, undefined);
    }

    async getAllFields(): Promise<JiraField[]> {
        return this.jiraRequest<JiraField[]>(`field.getAllFields`, undefined, {}, undefined, (response: any) => {
            if (!Array.isArray(response) || response.length < 1)
                throw new Error(`CODE00000207 Expected non empty array of jira fields!`);
        });
    }

    async getServerInfo(): Promise<JiraServerInfo> {
        return this.jiraRequest<JiraServerInfo>(`serverInfo.getServerInfo`, undefined, {}, ["serverTime"], undefined);
    }

    async getIssueByKey(getIssueRequest: GetIssueRequest1): Promise<JiraIssue> {
        const ts = moment().format();
        if (!getIssueRequest.expand) getIssueRequest.expand = ["changelog"];
        else getIssueRequest.expand.push("changelog");
        const r = await this.jiraRequest<JiraIssue>(
            `issue.getIssue`,
            undefined,
            getIssueRequest,
            ["id", "key", "fields", "changelog"],
            undefined
        );
        if (r) {
            r.ts = ts;
            r.type = "issue";
        }
        return r;
    }

    // Находит максимальный номер issue в проекте. Нельзя использовать с JQL в котором несколько проектов - будет undefined behaviour
    async searchLastIssue(query0: SearchRequest): Promise<number | undefined> {
        const query = Object.assign({}, query0, {
            maxResults: 1,
            jql: query0.jql.toUpperCase().split("ORDER BY")[0] + " ORDER BY issuekey DESC",
        });
        if (query.fullLoad) delete query.fullLoad;

        let issuesList = await this.jiraRequest<JiraIssue[]>(`search.search`, "issues", query, undefined, undefined);
        if (issuesList) for (let issue of issuesList) return Number(issue.key.split("-")[1]);
        return undefined;
    }

    issuesToContextInputs(r: IssueContextInput[], issues: JiraIssue[]) {
        for (let issue of issues)
            r.push({
                project: issue.key.split("-")[0],
                issueKey: issue.key,
                updated: issue.fields.updated,
            });
    }

    async jqlGetIssueKeys(jql: string): Promise<IssueContextInput[]> {
        let issues = await this.jiraRequest<JiraIssue[]>(
            `search.search`,
            "issues",
            {
                jql,
                fields: ["id", "updated"],
            },
            undefined,
            undefined
        );
        const result: IssueContextInput[] = [];
        this.issuesToContextInputs(result, issues);
        return result;
    }
}

// const pthis = this;
// return pthis.ysemaphore.lock(async () => {
// });
