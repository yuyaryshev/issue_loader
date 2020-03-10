import { observable } from "mobx";
import axios from "axios";
import moment from "moment";
import debugjs from "debug";
import { containerDelete } from "Ystd";
import { Severity, SeverityLong } from "../Ystd";

const MAX_LOG_ITEMS = 300;
const debugReload = debugjs("reload");

moment.locale("ru");

export const reformatDate = (t, prop) => {
    t[prop] = t[prop] ? moment(t[prop]).format("HH:mm:ss - DD.MM.YYYY (dddd)") : "";
    return t[prop];
};

const copyPrimitiveFields = (target, source) => {
    for (let k in source) if (typeof source[k] !== "object" && target[k] !== source[k]) target[k] = source[k];
};

export class RunStatus {
    @observable instanceName = "???";
    @observable versionStr = "?.?.?";
    @observable connected = false;
    @observable lastRun = "";
    @observable jiraTime = "";
    @observable streams = [];
    @observable jobs = [];
    @observable logs = [];
    @observable knownErrors = [];
    @observable lastRefresh = "";

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

export class GlobalUIState {
    @observable jobDetailsInGrid = false;
    @observable jobsFilter;
    @observable logsFilter;
    @observable statusTab = 0;

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
            pthis.statusTab = newValue;
        };
    }
}

export const globalUIState = new GlobalUIState();

let shouldRequestFullRefresh = true;
let waitingForFullRefresh = true;

export class LogItem {
    @observable ts;
    @observable cpl;
    @observable severity;
    @observable message;
    @observable data;

    constructor() {
        const pthis = this;
    }
}

export class JobStatus {
    @observable id;
    @observable parent;
    @observable key;
    @observable priority;
    @observable cancelled;
    @observable deps_succeded;
    @observable createdTs;
    @observable finishedTs;
    @observable jobType;
    @observable succeded;
    @observable startedTs;
    @observable prevError;
    @observable retryIntervalIndex;
    @observable nextRunTs;
    @observable input;
    @observable prevResult;
    @observable paused;
    @observable timesSaved;
    @observable updatedTs;
    @observable deleted;

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
let urlBase = undefined;

let lastReloadTs = undefined;

const severityLongStr = severity => {
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
    let thisReloadTs = moment();
    runStatus.lastRefresh = moment().format("HH:mm:ss");
    try {
        if (!urlBase) {
            urlBase = window.location.href;
            if (!urlBase.endsWith("/")) urlBase = urlBase + "/";
        }

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
            reformatDate(job, "startedTs");
            reformatDate(job, "finishedTs");
            reformatDate(job, "createdTs");
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
        debugReload(`Finished reloadData - OK`);
    } catch (e) {
        runStatus.connected = false;
        // runStatus.streams = [];
        runStatus.jobs = [];
        runStatus.logs = [];
        runStatus.jiraTime = undefined;
        delete runStatus.lastRefresh;
        console.error(`Finished reloadData - ERROR`, e);
    }
    setTimeout(reloadData, 300);
}

reloadData();

if (module.hot) {
    module.hot.accept();
}
