import { JobUnloadException } from "./JobUnloadException";
import { retryInterval as retryIntervalByIndex } from "./JobRetryInterval";
import deepEqual from "fast-deep-equal";
import moment from "moment";
// @ts-ignore
import { Job } from "./Job";

export async function runJob(job: Job) {
    if (job.unloaded) {
        job.jobStorage.my_console.error(`CODE00000101`, ` - can't start unloaded job!`);
        throw new Error(`CODE00000124 - can't start unloaded job!`);
    }

    for (let handler of job.jobStorage.onJobStartHandlers) handler(job, "CODE00000201");
    if (job.paused) {
        await job.save(false);
        return;
    }

    state_Starting(job);
    sch_ClearNext(job);
    info_Starting(job);

    await job.save(false);

    //-------------------------------------
    let hasError = true;
    let prevError;
    let newResult;

    job.running = true;
    job.jobStorage.fixJobContainer(job);
    try {
        newResult = await job.jobType.func(job.jobStorage.env, job, job.input);
        hasError = false;
    } catch (error) {
        prevError = job.prevError = error.message;
    }
    job.running = false;

    const successful = !job.cancelled && !hasError && checkDeps(job);

    if (successful) {
        job.setStep("CODE00000121", "Comparing job result with previous result", undefined);
        const changed = !deepEqual(job.prevResult, newResult);

        // debugger;
        // FUTURE_TEST Убедиться что сравнение не будет выявлять левые поля в итоге постоянно увеличивая и увеличивая историю
        // И ему не мешают всякие timestamp, которые вообще всегда изменяются
        // Удалить коммент ниже если сравнение работает нормально, а если не работает - перенести его куда-то - если
        // const savedTs = newIssue.ts;
        // if (!!oldIssue) newIssue.ts = oldIssue.ts;

        job.setStep("CODE00000181", `Result is ${changed ? "different from" : "same as"} previous`, undefined);
        if (changed) job.prevResult = newResult;

        state_Success(job);
        sch_Success(job);
        info_Success(job);
        await job.save(true);
        job.jobStorage.fixJobContainer(job);

        for (let handler of job.jobStorage.onJobStopHandlers) handler(job, "CODE00000177");
        return;
    } else {
        if (prevError instanceof JobUnloadException) await job.unload();

        state_Error(job);
        sch_Retry(job);
        info_Fail(job, hasError);

        for (let handler of job.jobStorage.onJobStopHandlers) handler(job, "CODE00000206");
        return;
    }
}

export const checkDeps = (job: Job) => {
    for (let [, depItem] of job.deps)
        if (!depItem.succeded) {
            // If so, the result is stale
            job.deps_succeded = false;
            return false;
        }
    job.deps_succeded = true;
    return true;
};

const updateObservers = (job: Job) => {
    for (let observerId of job.observers) {
        const observerJob = job.jobStorage.findJobById(observerId);
        if (observerJob) {
            job.deps.set(job.key, { id: job.id, succeded: job.succeded, result: job.succeded && job.prevResult });
            if (checkDeps(job)) {
                state_Stale(observerJob);
                observerJob.jobStorage.fixJobContainer(observerJob);
            }
        }
    }
};

//=================================== State START ==================================
function state_Starting(job: Job) {
    // GRP_job_ready_states
    job.touch();
    job.cancelled = false;
    job.running = true;
    job.succeded = false;
    //job.paused;                   // Shouldn't be changed here
    job.deps = new Map();
    // updateObservers(job);         //  Shouldn't be changed here
}

function state_Success(job: Job) {
    // GRP_job_ready_states
    job.touch();
    job.cancelled = false;
    job.running = false;
    job.succeded = true;
    //job.paused;                   // Shouldn't be changed here
    // job.deps = new Map();        //  Shouldn't be changed here
    updateObservers(job);
}

function state_Error(job: Job) {
    // GRP_job_ready_states
    job.touch();
    job.cancelled = false;
    job.running = false;
    job.succeded = false;
    //job.paused;                   // Shouldn't be changed here
    // job.deps = new Map();        //  Shouldn't be changed here
    // updateObservers(job);        //  Shouldn't be changed here
}

function state_Stale(job: Job) {
    // GRP_job_ready_states
    job.touch();
    if (job.running) job.cancelled = true; // Else - not running - don't change anything
    job.succeded = false;
    //job.paused;                   // Shouldn't be changed here
    // job.deps = new Map();        //  Shouldn't be changed here - it's already set before call to this
    // updateObservers(job);        //  Shouldn't be changed here
}

//=================================== State END ====================================

//

//================================ Scheduling START ================================
export function sch_ClearNext(job: Job) {
    job.touch();
    job.nextRunTs = undefined;
    job.jobStorage.fixJobContainer(job);
}

function sch_SetNext(job: Job, nextRunTs: moment.Moment) {
    job.touch();
    job.nextRunTs = nextRunTs;
    // if (job.nextRunTs.diff(moment(), "ms") > job.jobStorage.maxAwaitBeforeUnload)
    //     throw new JobUnloadException("CODE00000119");
    // else
    job.jobStorage.fixJobContainer(job);
}

function sch_Success(job: Job) {
    job.touch();
    job.retryIntervalIndex = 0;
}

function sch_Retry(job: Job) {
    const retryInterval = retryIntervalByIndex(job.retryIntervalIndex++);
    sch_SetNext(job, moment().add(retryInterval));
}

//================================ Scheduling END ==================================

//

//================================ Info START ================================
function info_Starting(job: Job) {
    job.touch();
    // GRP_job_info_fields
    job.startedTs = moment();
    job.finishedTs = undefined;
    job.waitType = undefined;
    job.prevError = undefined;
    job.setStep("CODE00000120", "Starting", undefined);
}

function info_Success(job: Job) {
    job.touch();
    // GRP_job_info_fields
    // job.startedTs = moment();     //  Shouldn't be changed here
    job.finishedTs = moment();
    job.waitType = undefined;
    job.prevError = undefined;
    job.setStep("CODE00000129", "Successful", undefined);
}

function info_Fail(job: Job, hasError: boolean) {
    job.touch();
    // GRP_job_info_fields
    // job.startedTs = moment();     //  Shouldn't be changed here
    job.finishedTs = moment();
    job.waitType = undefined;
    if (!hasError) job.prevError = "Cancelled";
    job.setStep("CODE00000130", hasError ? "Error" : "Cancelled", undefined);
}

//================================ Info END ==================================
