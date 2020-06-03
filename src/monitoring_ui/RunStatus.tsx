import { observable, extendObservable } from "mobx";
import axios from "axios";
import moment from "moment";
import debugjs from "debug";
import { addToField, containerDelete, deleteKeys, Severity } from "Ystd";
import React from "react";
import Cookie from "js-cookie";
import {
    emptyIssueStatsApiResponse,
    IssueLoaderStatItem,
    IssueStatsApiResponse,
} from "../monitoring_api/issueStatsApi.types";
import { run } from "../entry_scripts/run";

const MAX_LOG_ITEMS = 300;
const debugReload = debugjs("reload");

moment.locale("ru");

export const reformatDate = (t: any, prop: string) => {
    t[prop] = t[prop] ? moment(t[prop]).format("HH:mm:ss - DD.MM.YYYY (dddd)") : "";
    return t[prop];
};

const copyPrimitiveFields = (target: any, source: any) => {
    for (let k in source) if (typeof source[k] !== "object" && target[k] !== source[k]) target[k] = source[k];
};

export class ProjectItem {
    @observable "99_yrunning": number = 0;
    @observable "01_jira": number = 0;
    @observable "02_transform": number = 0;
    @observable "03_db": number = 0;
    @observable "99_zerror": number = 0;
    @observable "99_succeded": number = 0;

    constructor(public readonly name: string) {}
}

export class ProjectStats {
    @observable projects: ProjectList = {};
    @observable loading: moment.Moment | undefined = undefined;
    @observable error: string = "";

    constructor() {}

    clear() {
        this.projects = {};
    }
}

export interface ProjectList {
    [key: string]: ProjectItem;
}

export interface sqlResultFromApi {
    querySql: any[];
    columns: any[];
    process: boolean;
    error: string;
}

export interface runIssuesConfigType {
    startIssueMode: startIssueModeT;
    startIssueType: startIssueTypeT;
    startIssueProjectAlert: boolean;
    allProjects: boolean;
}

export type startIssueTypeT = "issues" | "projects" | undefined;
export type startIssueModeT = "reload" | "from_cache" | "continue" | undefined;

export class RunStatus {
    @observable instanceName = "???";
    @observable versionStr = "?.?.?";
    @observable connected = false;
    @observable globalMessages: any = {};
    @observable lastRun = "";
    @observable jiraTime = "";
    @observable streams = [];
    @observable issues: any[] = [];
    @observable graph: any = {};
    @observable jobs: any[] = [];
    @observable logs: any[] = [];
    @observable projectStats: ProjectStats = new ProjectStats();
    @observable jobStats: any = {};
    @observable knownErrors: any[] = [];
    @observable lastRefresh = "";
    @observable jiraStatus: any = {};
    @observable startLocks: number = 0;
    @observable unloading: number = 0;
    @observable contextsLoaded: number = 0;
    @observable contextsReadyToRun: number = 0;
    @observable contextsRunning: number = 0;
    @observable maxContextsInMem: number = 0;
    @observable resurses: any = {};
    @observable resources: any = {};
    @observable resourcesLimits: any = {};
    @observable projectsAnalysis: any[] = [];
    @observable pass: string = "";

    @observable importExportMode: string = "";
    @observable importExportCurrent: number = 0;
    @observable importExportTotal: number = 1;

    @observable runIssuesConfig: runIssuesConfigType = {
        startIssueMode: undefined,
        startIssueType: undefined,
        startIssueProjectAlert: false,
        allProjects: false,
    };
    @observable sqlReturn: sqlResultFromApi = { querySql: [], columns: [], process: false, error: "" };
    @observable sql: string = "";
    @observable maxResult: number = 20;

    // @computed
    // get computedExample() {
    //     return `This is a computed value: this.selectedItem.id = ${(this.selectedItem || {}).id}, this.title=${this.title}`;
    // }
}

export class RunStreamStatus {
    @observable id = "";
    @observable lastRun = "";
    @observable lastRunOk = undefined;
    @observable lastCount = 0;
    @observable lastTotal = 0;
    @observable countToday = 0;
    @observable count10min = 0;
    @observable errors = [];
    @observable status = "";
    @observable partStatuses = [];

    // @computed
    // get computedExample() {
    //     return `This is a computed value: this.selectedItem.id = ${(this.selectedItem || {}).id}, this.title=${this.title}`;
    // }
}

export function getFieldsForColumnsFormat(obj: object) {
    let columns: any = [];
    for (let i in obj) {
        columns.push({ name: i, selector: i });
    }
    return columns;
}

export type TabName = "Issues" | "Jobs" | "Logs" | "IssueStats" | "JobStats" | "RunIssues" | "SQL";
export const tabNames: TabName[] = ["Issues", "Jobs", "Logs", "IssueStats", "JobStats", "RunIssues", "SQL"];

export class GlobalUIState {
    @observable jobDetailsInGrid: boolean = false;
    @observable issue_stats_checkProjects: boolean = true;
    @observable issue_stats_checkAll: boolean = false;
    @observable job_stats_checkProjects: boolean = true;
    @observable job_stats_checkAll: boolean = false;
    @observable jobsFilter: string | undefined;
    @observable logsFilter: string | undefined;
    @observable statusTab: TabName = "IssueStats"; //Issues
    @observable issuesForStart: string | undefined;
    @observable issuesForStartA: string[] | undefined;

    notification!: (s: string, opts: any) => void;
    info!: (s: string) => void;
    success!: (s: string) => void;
    warn!: (s: string) => void;
    error!: (s: string) => void;
    showResponse!: (response: any, ui_success_message?: string) => void;

    toggleJobDetailsInGrid: () => void;
    requestFullRefresh: () => Promise<void>;
    setJobsFilter: (event: any) => void;
    setLogsFilter: (event: any) => void;
    statusTabChanged: (event: any, newValue: number) => void;
    setIssuesForStart: (event: any) => void;
    sendSelectForSQLite: (event: any) => void;
    setSQLtext: (event: any) => void;
    setMaxRowsresult: (event: any) => void;
    setPass: (event: any) => void;

    sendAlertForProjects: () => Promise<void>;

    openIssueProjectAlert: () => Promise<void>;
    closeIssueProjectAlert: () => Promise<void>;
    closeAndStartIssueProjectAlert: () => Promise<void>;

    sendIssuesForStart: () => Promise<void>;
    import: () => Promise<void>;
    export: () => Promise<void>;
    shutdown: () => Promise<void>;

    constructor() {
        const pthis = this;
        this.toggleJobDetailsInGrid = () => {
            pthis.jobDetailsInGrid = !pthis.jobDetailsInGrid;
        };

        this.requestFullRefresh = async () => {
            shouldRequestFullRefresh = true;
            waitingForFullRefresh = true;
            console.log(`Requested full refresh!`);
        };

        this.setJobsFilter = event => {
            pthis.jobsFilter = event.target.value;
        };

        this.setLogsFilter = event => {
            pthis.logsFilter = event.target.value;
        };

        this.statusTabChanged = (event, newValue) => {
            console.log("this.statusTabChanged2 = ", event.target);
            pthis.statusTab = tabNames[newValue]; //newValue
        };

        this.setIssuesForStart = event => {
            pthis.issuesForStart = event.target.value;
        };

        this.sendAlertForProjects = async () => {
            if (runStatus.runIssuesConfig.startIssueType === "projects") {
                this.openIssueProjectAlert();
            } else if (runStatus.runIssuesConfig.startIssueType === "issues") {
                this.sendIssuesForStart();
            }
        };

        this.openIssueProjectAlert = async () => {
            runStatus.runIssuesConfig.startIssueProjectAlert = true;
        };
        this.closeIssueProjectAlert = async () => {
            runStatus.runIssuesConfig.startIssueProjectAlert = false;
        };
        this.closeAndStartIssueProjectAlert = async () => {
            runStatus.runIssuesConfig.startIssueProjectAlert = false;
            this.sendIssuesForStart();
        };

        this.openIssueProjectAlert = async () => {
            runStatus.runIssuesConfig.startIssueProjectAlert = true;
        };

        this.sendIssuesForStart = async () => {
            let response = { data: { error: "Некорректно заполненные параметры" } };
            if (
                runStatus.runIssuesConfig.startIssueType &&
                runStatus.runIssuesConfig.startIssueMode &&
                (globalUIState.issuesForStart ||
                    (runStatus.runIssuesConfig.allProjects && runStatus.runIssuesConfig.startIssueType == "projects"))
            ) {
                response = await axios.get(urlBase + "api/runIssuesApi", {
                    params: {
                        objType: runStatus.runIssuesConfig.startIssueType,
                        mode: runStatus.runIssuesConfig.startIssueMode,
                        objectsForStart: globalUIState.issuesForStart,
                        allProjects: runStatus.runIssuesConfig.allProjects,
                    },
                });
            }
            globalUIState.showResponse(response, `starts working!`);
        };

        this.shutdown = async () => {
            if (!runStatus?.pass?.length) {
                globalUIState.error(`Admin password required!`);
                return;
            }

            let response = await axios.get(urlBase + "api/shutdown", {
                params: {
                    pass: runStatus.pass,
                },
            });
            globalUIState.showResponse(response, `starts working!`);
        };

        this.import = async () => {
            if (!runStatus?.pass?.length) {
                globalUIState.error(`Admin password required!`);
                return;
            }

            let response = await axios.get(urlBase + "api/import", {
                params: {
                    pass: runStatus.pass,
                },
            });
            globalUIState.showResponse(response, `Import starts!`);
        };

        this.export = async () => {
            //globalUIState.showResponse({warn: true}, `Starts EXPORTING!`);
            if (!runStatus?.pass?.length) {
                globalUIState.error(`Admin password required!`);
                return;
            }

            let response = await axios.get(urlBase + "api/export", {
                params: {
                    pass: runStatus.pass,
                },
            });
            globalUIState.showResponse(response, `Export starts!`);
        };

        this.sendSelectForSQLite = async () => {
            try {
                runStatus.sqlReturn.process = true;
                let { data } = await axios.get(urlBase + "api/sqlapi", {
                    params: {
                        sql: runStatus.sql,
                        limit_rows: runStatus.maxResult, // TODO куда нибудь вынести
                    },
                });
                runStatus.sqlReturn.process = false;
                if (data.error) {
                    runStatus.sqlReturn.error = data.error;
                    runStatus.sqlReturn.querySql = [];
                    runStatus.sqlReturn.columns = [];
                } else {
                    runStatus.sqlReturn.querySql = data.JSONtable;
                    runStatus.sqlReturn.columns = getFieldsForColumnsFormat(data.JSONtable[0]);
                }
            } catch (e) {
                globalUIState.showResponse({ data: { error: "ooops2" + e } }, `ooops2!`);
            }
        };

        this.setSQLtext = event => {
            runStatus.sql = event.target.value;
        };

        this.setPass = event => {
            runStatus.pass = event.target.value;
            Cookie.set("pass", runStatus.pass);
        };

        const savedPass = Cookie.get("pass");
        if (savedPass && savedPass.length) runStatus.pass = savedPass;

        this.setMaxRowsresult = event => {
            runStatus.maxResult = event.target.value;
        };
    }
}

let shouldRequestFullRefresh = true;
let waitingForFullRefresh = true;

export class AnalysisItem {
    @observable project: string | undefined;
    @observable args: number | undefined;
    @observable succededJobs: number | undefined;
    @observable failedJobs: number | undefined;
    @observable runningJobs: number | undefined;

    constructor() {
        const pthis = this;
    }
}

export class LogItem {
    @observable ts: string | undefined;
    @observable cpl: string | undefined;
    @observable severity: Severity | undefined;
    @observable message: string | undefined;
    @observable data: string | undefined;

    constructor() {
        const pthis = this;
    }
}

export class JobStatus {
    @observable id: string | undefined;
    @observable parent: string | undefined;
    @observable key: string | undefined;
    @observable priority: string | undefined;
    @observable cancelled: string | undefined;
    @observable predecessorsDone: string | undefined;
    @observable jobType: string | undefined;
    @observable succeded: string | undefined;
    @observable prevError: string | undefined;
    @observable retryIntervalIndex: string | undefined;
    @observable nextRunTs: string | undefined;
    @observable input: string | undefined;
    @observable result: string | undefined;
    @observable paused: string | undefined;
    @observable timesSaved: string | undefined;
    @observable updatedTs: string | undefined;
    @observable deleted: string | undefined;

    resume: () => Promise<void>;
    pause: () => Promise<void>;
    makeStale: () => Promise<void>;

    // @computed
    // get computedExample() {
    //     return `This is a computed value: this.selectedItem.id = ${(this.selectedItem || {}).id}, this.title=${this.title}`;
    // }
    constructor() {
        const pthis = this;

        this.resume = async () => {
            const response = await axios.get("api/jobResume", {
                params: {
                    jobId: pthis.id,
                },
            });
            globalUIState.showResponse(response, `Job ${pthis.id} resumed!`);
        };

        this.pause = async () => {
            const response = await axios.get(urlBase + "api/jobPause", {
                params: {
                    jobId: pthis.id,
                },
            });
            globalUIState.showResponse(response, `Job ${pthis.id} paused!`);
        };

        this.makeStale = async () => {
            const response = await axios.get(urlBase + "api/jobMakeStale", {
                params: {
                    jobId: pthis.id,
                },
            });
            globalUIState.showResponse(response, `Job ${pthis.id} made stale!`);
        };
    }
}

export const runStatus = new RunStatus();
export const globalUIState = new GlobalUIState();

let urlBase: string = "";

let lastReloadTs: moment.Moment | undefined = undefined;

const severityLongStr = (severity: Severity): string => {
    switch (severity) {
        case "D":
            return "DEBUG";
        case "E":
            return "ERROR";
        case "F":
            return "FATAL";
        case "I":
            return "INFO ";
        case "W":
            return "WARN ";
    }
    return "ERROR";
};

async function reloadData() {
    debugReload(`Started reloadData`);
    runStatus.lastRefresh = moment().format("HH:mm:ss");
    try {
        if (!urlBase) {
            urlBase = window.location.href;
            if (!urlBase.endsWith("/")) urlBase = urlBase + "/";
        }

        // Получаем общий статус программы
        {
            const { data } = await axios.get(urlBase + "api/status", {
                params: {
                    ts: (!shouldRequestFullRefresh && lastReloadTs && lastReloadTs.format()) || undefined,
                    filter: globalUIState.jobsFilter ? globalUIState.jobsFilter.trim() : undefined,
                },
            });

            runStatus.connected = true;
            copyPrimitiveFields(runStatus, data);
            //copyPrimitiveFields(runStatus.resurses, data.resurses);
            copyPrimitiveFields(runStatus.resources, data.resources);
            copyPrimitiveFields(runStatus.resourcesLimits, data.resourcesLimits);
            // runStatus.jiraStatus = data.jiraStatus;
            // runStatus.globalMessages = data.globalMessages;
            // runStatus.startLocks = data.startLocks;
            // runStatus.unloading = data.unloading;
            // runStatus.contextsLoaded = data.contextsLoaded;
            // runStatus.maxContextsInMem = data.maxContextsInMem;
            // runStatus.contextsReadyToRun = data.maxContextsInMem;
        }

        if (globalUIState.statusTab === "Issues") {
            runStatus.runIssuesConfig = {
                startIssueMode: undefined,
                startIssueType: undefined,
                startIssueProjectAlert: false,
                allProjects: false,
            };
            runStatus.sql = "";
            runStatus.sqlReturn = { querySql: [], columns: [], process: false, error: "" };

            const { data } = await axios.get(urlBase + "api/issues", {
                params: {
                    ts: (!shouldRequestFullRefresh && lastReloadTs && lastReloadTs.format()) || undefined,
                    filter: globalUIState.jobsFilter ? globalUIState.jobsFilter.trim() : undefined,
                },
            });

            shouldRequestFullRefresh = false;
            lastReloadTs = moment(data.ts);
            reformatDate(data, "lastRun");
            reformatDate(data, "jiraTime");

            for (let job of data.issues) {
                reformatDate(job, "updatedTs");
                reformatDate(job, "nextRetryTs");
            }

            copyPrimitiveFields(runStatus, data);

            if (data.fullRefresh) {
                if (waitingForFullRefresh) {
                    waitingForFullRefresh = false;
                    globalUIState.info("Status was fully refreshed!");
                }

                L_outter1: for (let i = runStatus.issues.length - 1; i >= 0; i--) {
                    const clientJob: any = runStatus.issues[i];
                    for (let job of data.issues) if (clientJob.id === job.id) continue L_outter1;
                    runStatus.issues.splice(i, 1);
                }

                runStatus.logs.length = 0;
            }

            L_outter21: for (let job of data.issues) {
                for (let clientJob of runStatus.issues) {
                    if (clientJob.id === job.id) {
                        // MATCH
                        copyPrimitiveFields(clientJob, job);
                        clientJob.jsonUpper = JSON.stringify(job).toUpperCase();
                        if (clientJob.deleted) {
                            // Schedule to delete later
                            setTimeout(() => {
                                if (clientJob.deleted) containerDelete(runStatus.issues, clientJob);
                            }, 10 * 1000);
                        }
                        continue L_outter21;
                    }
                }

                // NO MATCH
                const clientJob = new JobStatus();
                copyPrimitiveFields(clientJob, job);
                runStatus.issues.push(clientJob);
            }

            if (runStatus.logs.length > MAX_LOG_ITEMS) runStatus.logs.splice(0, runStatus.logs.length - MAX_LOG_ITEMS);

            runStatus.issues = data.issues;
            runStatus.jobs = [];
            runStatus.logs = [];
            runStatus.projectStats.clear();
            runStatus.jobStats = {};

            document.title = "issue_loader: " + runStatus.instanceName;

            /// если выбрана таблица jobs
        } else if (globalUIState.statusTab === "Jobs") {
            runStatus.runIssuesConfig = {
                startIssueMode: undefined,
                startIssueType: undefined,
                startIssueProjectAlert: false,
                allProjects: false,
            };
            runStatus.sql = "";
            runStatus.sqlReturn = { querySql: [], columns: [], process: false, error: "" };

            const { data } = await axios.get(urlBase + "api/jobs", {
                params: {
                    ts: (!shouldRequestFullRefresh && lastReloadTs && lastReloadTs.format()) || undefined,
                    filter: globalUIState.jobsFilter ? globalUIState.jobsFilter.trim() : undefined,
                },
            });

            shouldRequestFullRefresh = false;
            lastReloadTs = moment(data.ts);
            reformatDate(data, "lastRun");
            reformatDate(data, "jiraTime");

            for (let job of data.jobs) {
                reformatDate(job, "updatedTs");
                reformatDate(job, "nextRetryTs");
            }

            copyPrimitiveFields(runStatus, data);

            if (data.fullRefresh) {
                if (waitingForFullRefresh) {
                    waitingForFullRefresh = false;
                    globalUIState.info("Status was fully refreshed!");
                }

                L_outter1: for (let i = runStatus.jobs.length - 1; i >= 0; i--) {
                    const clientJob: any = runStatus.jobs[i];
                    for (let job of data.jobs) if (clientJob.id === job.id) continue L_outter1;
                    runStatus.jobs.splice(i, 1);
                }

                runStatus.logs.length = 0;
            }

            L_outter21: for (let job of data.jobs) {
                for (let clientJob of runStatus.jobs) {
                    if (clientJob.id === job.id) {
                        // MATCH
                        copyPrimitiveFields(clientJob, job);
                        clientJob.jsonUpper = JSON.stringify(job).toUpperCase();
                        if (clientJob.deleted) {
                            // Schedule to delete later
                            setTimeout(() => {
                                if (clientJob.deleted) containerDelete(runStatus.jobs, clientJob);
                            }, 10 * 1000);
                        }
                        continue L_outter21;
                    }
                }

                // NO MATCH
                const clientJob = new JobStatus();
                copyPrimitiveFields(clientJob, job);
                runStatus.jobs.push(clientJob);
            }

            if (runStatus.logs.length > MAX_LOG_ITEMS) runStatus.logs.splice(0, runStatus.logs.length - MAX_LOG_ITEMS);

            runStatus.issues = [];
            runStatus.graph = {};
            runStatus.jobs = data.jobs;
            runStatus.logs = [];
            runStatus.projectStats.clear();
            runStatus.jobStats = {};

            document.title = "issue_loader: " + runStatus.instanceName;

            /// если выбрана таблица log
        } else if (globalUIState.statusTab === "Logs") {
            runStatus.runIssuesConfig = {
                startIssueMode: undefined,
                startIssueType: undefined,
                startIssueProjectAlert: false,
                allProjects: false,
            };
            runStatus.sql = "";
            runStatus.sqlReturn = { querySql: [], columns: [], process: false, error: "" };
            const { data } = await axios.get(urlBase + "api/logs", {
                params: {},
            });

            shouldRequestFullRefresh = false;
            lastReloadTs = moment(data.ts);

            for (let log of data.logs) {
                reformatDate(log, "ts");
                log.severity = severityLongStr(log.severity);
            }

            copyPrimitiveFields(runStatus, data);

            for (let log of data.logs) {
                const clientLog = new LogItem();
                copyPrimitiveFields(clientLog, log);
                runStatus.logs.push(clientLog);
            }

            runStatus.logs = data.logs;

            if (runStatus.logs.length > MAX_LOG_ITEMS) runStatus.logs.splice(0, runStatus.logs.length - MAX_LOG_ITEMS);

            runStatus.issues = [];
            runStatus.graph = {};
            runStatus.jobs = [];
            runStatus.projectStats.clear();
            runStatus.jobStats = {};

            document.title = "issue_loader: " + runStatus.instanceName;

            /// если выбрана таблица stats
        } else if (globalUIState.statusTab === "IssueStats") {
            runStatus.runIssuesConfig = {
                startIssueMode: undefined,
                startIssueType: undefined,
                startIssueProjectAlert: false,
                allProjects: false,
            };
            runStatus.sql = "";
            runStatus.sqlReturn = { querySql: [], columns: [], process: false, error: "" };
            try {
                runStatus.projectStats.loading = moment();

                //graphChart
                if (1 == 1) {
                    // если давно не запрашивали, то запрашиваем
                    {
                        runStatus.graph = { jobsData: [], resourcesData: [], storageData: [] };
                        const { data } = (await axios.get(urlBase + "api/graphChart", {
                            params: {
                                ts: runStatus.projectStats.loading,
                                period: "per2hours",
                            },
                        })) as any;
                        runStatus.graph.jobsData = data.graph.jobsData;
                        runStatus.graph.resourcesData = data.graph.resourcesData;
                        runStatus.graph.storageData = data.graph.storageData;
                    }
                }

                //issueStats
                const { data } = (await axios.get(urlBase + "api/issueStats", {
                    params: {
                        ts: (!shouldRequestFullRefresh && lastReloadTs && lastReloadTs.format()) || undefined,
                    },
                })) as { data: IssueStatsApiResponse };

                for (let projectAnalysis of data.stats) {
                    reformatDate(projectAnalysis, "minTs");
                    reformatDate(projectAnalysis, "maxTs");
                }

                runStatus.issues = [];

                const staleProjects: Set<string> = new Set(Object.keys(runStatus.projectStats.projects));

                const newStatsAgg: any = {};
                for (let stat of data.stats) {
                    let newStat = (newStatsAgg[stat.project] = newStatsAgg[stat.project] || ({} as any));

                    if (stat.state === "running") addToField(newStat, "99_yrunning", stat.c);
                    else if (stat.hasError) addToField(newStat, "99_zerror", stat.c);
                    else addToField(newStat, stat.stage, stat.c);
                }

                for (let project in newStatsAgg)
                    if (newStatsAgg.hasOwnProperty(project)) {
                        staleProjects.delete(project);
                        let targetItem = runStatus.projectStats.projects[project.toString()];
                        extendObservable(runStatus.projectStats.projects, {
                            [project.toString()]: targetItem = new ProjectItem(project),
                        });
                        copyPrimitiveFields(targetItem, newStatsAgg[project.toString()]);
                    }
                deleteKeys(runStatus.projectStats.projects, staleProjects);
            } finally {
                runStatus.projectStats.loading = undefined;
                runStatus.jobStats = {};
                runStatus.logs = [];
                runStatus.jobs = [];
            }
            /////////////////////////////////////////////////////// drop else
        } else if (globalUIState.statusTab === "JobStats") {
            //runStatus.projectsAnalysis = [];
            runStatus.sqlReturn = { querySql: [], columns: [], process: false, error: "" };
            runStatus.sql = "";
            runStatus.runIssuesConfig = {
                startIssueMode: undefined,
                startIssueType: undefined,
                startIssueProjectAlert: false,
                allProjects: false,
            };
            const { data } = await axios.get(urlBase + "api/jobStats", {
                params: {
                    ts: (!shouldRequestFullRefresh && lastReloadTs && lastReloadTs.format()) || undefined,
                },
            });

            for (let projectAnalysis of data.stats) {
                reformatDate(projectAnalysis, "minTs");
                reformatDate(projectAnalysis, "maxTs");
            }

            runStatus.issues = [];
            runStatus.graph = {};
            runStatus.jobStats = { stats: data.stats, error: data.error };
            runStatus.projectStats.clear();
            runStatus.logs = [];
            runStatus.jobs = [];

            /////////////////////////////////////////////////////// drop else
        } else if (globalUIState.statusTab === "RunIssues") {
            runStatus.sql = "";
            runStatus.sqlReturn = { querySql: [], columns: [], process: false, error: "" };
            runStatus.issues = [];
            runStatus.graph = {};
            runStatus.jobStats = {};
            runStatus.projectStats.clear();
            runStatus.logs = [];
            runStatus.jobs = [];
        } else if (globalUIState.statusTab === "SQL") {
            runStatus.runIssuesConfig = {
                startIssueMode: undefined,
                startIssueType: undefined,
                startIssueProjectAlert: false,
                allProjects: false,
            };
            runStatus.issues = [];
            runStatus.graph = {};
            runStatus.jobStats = {};
            runStatus.projectStats.clear();
            runStatus.logs = [];
            runStatus.jobs = [];
        }
        debugReload(`Finished reloadData - OK`);
    } catch (e) {
        // runStatus.streams = [];
        runStatus.issues = [];
        runStatus.graph = {};
        runStatus.jobs = [];
        runStatus.logs = [];
        runStatus.projectsAnalysis = [];
        runStatus.jiraTime = "";
        delete runStatus.lastRefresh;
        console.error(`Finished reloadData - ERROR`, e);
    }
    setTimeout(reloadData, 300);
}

reloadData();

if ((module as any).hot) {
    (module as any).hot.accept();
}

/*
const { data } = await axios.get(urlBase + "api/status", {
                params: {
                    ts: (!shouldRequestFullRefresh && lastReloadTs && lastReloadTs.format()) || undefined,
                },
            });

            shouldRequestFullRefresh = false;
            lastReloadTs = moment(data.ts);
            reformatDate(data, "lastRun");
            reformatDate(data, "jiraTime");

            for (let job of data.jobs) {
                reformatDate(job, "updatedTs");
                reformatDate(job, "nextRetryTs");
            }
            for (let log of data.logs) {
                reformatDate(log, "ts");
                log.severity = severityLongStr(log.severity);
            }

            copyPrimitiveFields(runStatus, data);

            if (data.fullRefresh) {
                if (waitingForFullRefresh) {
                    waitingForFullRefresh = false;
                    globalUIState.info("Status was fully refreshed!");
                }

                L_outter1: for (let i = runStatus.jobs.length - 1; i >= 0; i--) {
                    const clientJob = runStatus.jobs[i];
                    for (let job of data.jobs) if (clientJob.id === job.id) continue L_outter1;
                    runStatus.jobs.splice(i, 1);
                }

                runStatus.logs.length = 0;
            }

            L_outter21: for (let job of data.jobs) {
                for (let clientJob of runStatus.jobs) {
                    if (clientJob.id === job.id) {
                        // MATCH
                        copyPrimitiveFields(clientJob, job);
                        clientJob.jsonUpper = JSON.stringify(job).toUpperCase();
                        if (clientJob.deleted) {
                            // Schedule to delete later
                            setTimeout(() => {
                                if (clientJob.deleted) containerDelete(runStatus.jobs, clientJob);
                            }, 10 * 1000);
                        }
                        continue L_outter21;
                    }
                }

                // NO MATCH
                const clientJob = new JobStatus();
                copyPrimitiveFields(clientJob, job);
                runStatus.jobs.push(clientJob);
            }

            for (let log of data.logs) {
                const clientLog = new LogItem();
                copyPrimitiveFields(clientLog, log);
                runStatus.logs.push(clientLog);
            }

            if (runStatus.logs.length > MAX_LOG_ITEMS) runStatus.logs.splice(0, runStatus.logs.length - MAX_LOG_ITEMS);

            runStatus.connected = true;
            document.title = "issue_loader: " + runStatus.instanceName;
 */
