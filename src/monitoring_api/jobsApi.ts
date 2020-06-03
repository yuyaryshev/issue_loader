import { Env } from "other";
import moment from "moment";
import { debugMsgFactory as debugjs } from "Ystd";
import { JobStatus } from "../job/JobFieldsServer";

const debug = debugjs("jobsApi");

interface ClientJobsStatus extends JobStatus {
    issueKey: string;
}

// TODO привязать к JobFuildsServer
const JobContextFieldForFilter = [
    "key",
    "cancelled",
    "predecessorsDone",
    "retryIntervalIndex",
    "nextRunTs",
    "input",
    "timesSaved",
    "updatedTs",
    "deleted",
    "state",
    "project",
    "issueKey",
    "updatedTs",
];

const JobsFieldForFilter = ["id", "jobType", "paused", "succeded", "prevError"];

function filterParser(filterStringValue: string, filterMap: Map<string, string>) {
    /*
      Парсит строку фильтра, для того чтобы, если возможно, облегчить запрос в БД.
       -Берет знакомые поля из контекста и добавляет их к фильтру БД
       -Остальные поля старается отнести к полям Job'ов

      TODO Пока что не работает со сложными фильтрами (нельзя употреблять скобочки), если понадобится то это TODO
    */

    // если пользователь не трогал фильтр
    if (!filterStringValue) {
        filterMap.set("DBfilter", "1=1");
        filterMap.set("Jobsfilter", "true");
        return filterMap;
    }

    let filterArr = filterStringValue.split(/\s\s*/);
    let FilterStringArrValueForDb: string[] = [];
    let FilterStringArrValueForJs: string[] = [];

    // пробегаем по всем выражениям фильтра
    outreLoop: for (let currFiltFromArray of filterArr) {
        if (currFiltFromArray.trim() == "") continue;
        let currField = currFiltFromArray.split(/[=,!,<,>]/)[0];

        // пользователь имел ввиду поле контекста?
        for (let currFieldFromJobContext of JobContextFieldForFilter) {
            if (currField == currFieldFromJobContext) {
                // нужно добавить работу с *_c полями
                FilterStringArrValueForDb.push(currFiltFromArray + " ");
                continue outreLoop;
            }
        }

        // пользователь имел ввиду поле Джоба?
        for (let currFieldFromJobs of JobsFieldForFilter) {
            if (currField == currFieldFromJobs) {
                FilterStringArrValueForJs.push(
                    "job." + currFiltFromArray.replace("=", "==").replace("!==", "!=") + " "
                );
                continue outreLoop;
            }
        }

        // пользователь хотел объеденить выражения логическим И ?
        if (currFiltFromArray.toLowerCase() == "and") {
            if (FilterStringArrValueForDb.length > 0) {
                let lastFilterStringArrValueForDb = FilterStringArrValueForDb[FilterStringArrValueForDb.length - 1];
                if (
                    lastFilterStringArrValueForDb.toLowerCase() == "and" ||
                    lastFilterStringArrValueForDb.toLowerCase() == "or"
                ) {
                    null;
                } else {
                    FilterStringArrValueForDb.push(" and ");
                }
            }

            if (FilterStringArrValueForJs.length > 0) {
                let lastFilterStringArrValueForJs = FilterStringArrValueForJs[FilterStringArrValueForJs.length - 1];
                if (
                    lastFilterStringArrValueForJs.toLowerCase() == "and" ||
                    lastFilterStringArrValueForJs.toLowerCase() == "or"
                ) {
                    null;
                } else {
                    FilterStringArrValueForJs.push(" && ");
                }
            }

            continue;
        }

        // пользователь хотел объеденить выражения логическим ИЛИ ?
        if (currFiltFromArray.toLowerCase() == "or") {
            if (FilterStringArrValueForDb.length > 0) {
                let lastFilterStringArrValueForDb = FilterStringArrValueForDb[FilterStringArrValueForDb.length - 1];
                if (
                    lastFilterStringArrValueForDb.toLowerCase() == "and" ||
                    lastFilterStringArrValueForDb.toLowerCase() == "or"
                ) {
                    null;
                } else {
                    FilterStringArrValueForDb.push(" or ");
                }
            }

            if (FilterStringArrValueForJs.length > 0) {
                let lastFilterStringArrValueForJs = FilterStringArrValueForJs[FilterStringArrValueForJs.length - 1];
                if (
                    lastFilterStringArrValueForJs.toLowerCase() == "and" ||
                    lastFilterStringArrValueForJs.toLowerCase() == "or"
                ) {
                    null;
                } else {
                    FilterStringArrValueForJs.push(" || ");
                }
            }

            continue;
        }
    }

    // подготавливаем массивы в строку (в конце не должно быть логического "чегото")

    let DBfilterResult = "";
    for (let i = 0; i < FilterStringArrValueForDb.length; i++) {
        if (i == FilterStringArrValueForDb.length - 1) {
            if (FilterStringArrValueForDb[i] == " and " || FilterStringArrValueForDb[i] == " or ") {
                break;
            }
        }
        DBfilterResult += FilterStringArrValueForDb[i];
    }

    let JSfilterResult = "";
    for (let i = 0; i < FilterStringArrValueForJs.length; i++) {
        if (i == FilterStringArrValueForJs.length - 1) {
            if (FilterStringArrValueForJs[i] == " && " || FilterStringArrValueForJs[i] == " || ") {
                break;
            }
        }
        JSfilterResult += FilterStringArrValueForJs[i];
    }

    if (DBfilterResult == "") {
        filterMap.set("DBfilter", "1=1");
    } else {
        filterMap.set("DBfilter", DBfilterResult);
    }

    if (JSfilterResult == "") {
        filterMap.set("Jobsfilter", "true");
    } else {
        filterMap.set("Jobsfilter", JSfilterResult);
    }

    return filterMap;
}

// http://a123278.moscow.alfaintra.net:29364/api/jobs
export const jobsApi = async (env: Env, req: any, res: any) => {
    const ts = moment().format();
    let error: string | undefined = undefined;
    let ok: boolean = false;
    const { query } = req;
    const jobStatuses: ClientJobsStatus[] = [];
    //const jobStatuses: ClientJobsStatus[] = [];
    let filterMap = new Map<string, string>();

    try {
        env.jobStorage.refreshJobsStatus();

        filterMap = filterParser(query.filter, filterMap);

        let filtVal = filterMap.get("DBfilter");
        let sqlPrepare = env.jobStorage.db.prepare(`select * from jobContexts where ` + filtVal + " limit 20");

        let sqlData = sqlPrepare.all();

        filtVal = filterMap.get("Jobsfilter");
        let maxJobsForClientShown = 20;
        outer_loop: for (let issue of sqlData) {
            let cur_issueKey = issue.issueKey;
            for (let job of Object.values(JSON.parse(issue.jobsById)) as ClientJobsStatus[]) {
                if (!filtVal || eval(filtVal)) {
                    maxJobsForClientShown--;
                    if (maxJobsForClientShown < 0) break outer_loop;
                    job.issueKey = cur_issueKey;
                    jobStatuses.push(job);
                }
            }
        }
    } catch (e) {
        error = e.message;
        if (env.debugMode) debug(`CODE00000286 jobsApi for ts=${query.ts} - ERROR!`, e);
    }

    return res.send(
        JSON.stringify({
            ok,
            error,
            ts,
            jobs: jobStatuses,
        })
    );
};
