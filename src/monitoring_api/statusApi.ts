import { Env } from "other";
import moment from "moment";
import { debugMsgFactory as debugjs } from "Ystd";
import { JobResources } from "Yjob/JobResources";

const debug = debugjs("jobStatusApi");

// http://a123278.moscow.alfaintra.net:29364/api/status
export const statusApi = async (env: Env, req: any, res: any) => {
    const ts = moment().format();
    let error: string | undefined = undefined;
    let ok: boolean = false;
    const { query } = req;
    const fullRefresh = !query.ts || moment().diff(query.ts) > env.jobStorage.statusTTL;
    const jiraStats = env.jira.responseStats().total;

    let jiraStatus = {
        jiraRequestsPerSecond: jiraStats.c, /// Запросов к Jira в секунду
        JiraResposeErrorsCount: jiraStats.errorsCount, /// Количество ошибок к Jira в ответах
        JiraResponseAverageTime: jiraStats.avgMs, /// Среднее время отклика JIra
    };

    return res.send(
        JSON.stringify({
            ok,
            error,
            ts,
            fullRefresh,
            instanceName: env.settings.instanceName,
            versionStr: env.versionStr,
            globalMessages: env.globalMessages,
            jiraStatus: jiraStatus,
            startLocks: env.jobStorage.startLocks.size,
            unloading: env.jobStorage.unloading,
            contextsLoaded: env.jobStorage.jobContextById.size,
            maxContextsInMem: env.jobStorage.maxContextsInMem,
            contextsRunning: env.jobStorage.runningContextsCount(),
            contextsReadyToRun: env.jobStorage.readyToRunJobContexts.length,
            resources: env.jobStorage.jobResourcesCurrent,
            resourcesLimits: env.jobStorage.jobResourcesLimits,
            jobResourcesDelays: env.jobStorage.jobResourcesLimits,
            importExportCurrent: env.importExportCurrent,
            importExportTotal: env.importExportTotal,
            generatingIssues: env.settings.generate_issues_on,
        })
    );
};
