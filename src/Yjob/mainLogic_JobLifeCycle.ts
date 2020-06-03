import { JobWaitingDepsException, JobWaitingDepsSymbol } from "./JobWaitingDepsException";
import { retryInterval as retryIntervalByIndex } from "./JobRetryInterval";
import deepEqual from "fast-deep-equal";
import moment from "moment";
import { Job } from "./Job";
import { JobResourcesCheckAndAlloc, JobResourcesRelease } from "Yjob/JobResources";
import { checkPredecessors, notifySuccessors } from "Yjob/predecessors";
import { throwUnload } from "./JobType";

// @ts-ignore
if (false) console.log(throwUnload); // throwUnload shouldn't be removed because it's called in eval

export async function runJob(job: Job) {
    if (!JobResourcesCheckAndAlloc(job.jobStorage.jobResourcesCurrent, job.jobType.resources)) return;
    let successful: boolean = false;
    let successfulWithDeps: boolean = false;
    let hasError: false | string = "CODE00000001";
    let prevError;
    let newResult;

    try {
        hasError = "CODE00000300";

        job.jobContext.disableUnload++;
        if (job.unloaded) {
            job.jobStorage.my_console.error(`CODE00000217`, ` - can't start unloaded job!`);
            throw new Error(`CODE00000124 - can't start unloaded job!`);
        }

        job.jobStorage.my_console.log(
            `CODE00000317`,
            `${JSON.stringify((job.jobContext as any).issueKey)}.${job.jobType.type} - started!`
        );

        for (let handler of job.jobStorage.onJobStartHandlers) handler(job, "CODE00000201");
        if (job.paused) {
            await job.save(false);
            return;
        }

        state_Starting(job);
        sch_ClearNext(job);
        info_Starting(job);

        await job.save(false);
        hasError = "CODE00000257";

        //-------------------------------------

        job.running = true;
        hasError = "CODE00000258";
        job.jobStorage.updateJobState(job);
        try {
            hasError = "CODE00000259";
            newResult = await job.jobType.func(job.jobStorage.env, job, job.jobContext.input, job.input);
            hasError = false;
        } catch (error) {
            prevError = error || new Error("EMPTY ERROR CODE00000260");
        }
        job.running = false;

        checkPredecessors(job);

        successful = !hasError && newResult !== JobWaitingDepsSymbol;
        successfulWithDeps = successful && !job.cancelled && job.predecessorsDone;

        if (successful) {
            job.setStep("CODE00000121", "Comparing job result with previous result", undefined);
            if (!job.result && job.needToLoad) {
                job.result = job.jobStorage.loadResult(job.jobStorage.selectResultForJob.iterate(job.id));
                job.needToLoad = false;
            }
            const changed = !deepEqual(job.result, newResult);

            // debugger;
            // FUTURE_TEST Убедиться что сравнение не будет выявлять левые поля в итоге постоянно увеличивая и увеличивая историю
            // И ему не мешают всякие timestamp, которые вообще всегда изменяются
            // Удалить коммент ниже если сравнение работает нормально, а если не работает - перенести его куда-то - если
            // const savedTs = newIssue.ts;
            // if (!!oldIssue) newIssue.ts = oldIssue.ts;

            job.setStep("CODE00000181", `Result is ${changed ? "different from" : "same as"} previous`, undefined);
            if (changed) job.result = newResult;

            state_Success(job);
            sch_Success(job);
            info_Success(job);

            if (!successfulWithDeps) state_Stale(job);
            return;
        } else {
            if (prevError instanceof JobWaitingDepsException || newResult === JobWaitingDepsSymbol) {
                // TODO JobUnloadException это уже некорректная логика. По идее можно просто выйти из Job
                //await job.jobStorage.unloadException(this);
                job.jobStorage.my_console.error(
                    `CODE00000218`,
                    ` - JobUnloadException это уже некорректная логика. По идее можно просто выйти из Job!`,
                    JSON.stringify({
                        jobId: job.id,
                        jobContextId: job.jobContext.id,
                        jobType: job.jobType.type,
                        successful,
                        successfulWithDeps,
                        hasError,
                        typeof_newResult: typeof newResult,
                        cancelled: !job.cancelled,
                        predecessorsDone: job.predecessorsDone,
                    })
                );
                return;
            }

            if (!hasError) {
                // There is no error, but something is wrong!
                job.jobStorage.my_console.error(
                    `CODE00000219`,
                    ` - Should be unreachable! There is no error, but something is wrong!`,
                    JSON.stringify({
                        jobId: job.id,
                        jobContextId: job.jobContext.id,
                        jobType: job.jobType.type,
                        successful,
                        successfulWithDeps,
                        hasError,
                        typeof_newResult: typeof newResult,
                        cancelled: !job.cancelled,
                        predecessorsDone: job.predecessorsDone,
                    })
                );
                job.prevError = "CODE00000070" + "_UNKNOWN_ERROR";
                state_Error(job);
                sch_Retry(job, prevError.message);
                info_Fail(job, hasError);
            } else {
                /*
                job.jobStorage.my_console.error(
                    `CODE00000071`,
                    ` - we have an error!`,
                    JSON.stringify({
                        jobId: job.id,
                        jobContextId: job.jobContext.id,
                        jobType: job.jobType.type,
                        successful,
                        successfulWithDeps,
                        hasError,
                        typeof_newResult: typeof newResult,
                        cancelled: !job.cancelled,
                        predecessorsDone: job.predecessorsDone,
                    })
                );
                 */
                job.prevError = prevError.message;
                if (!job.prevError || !job.prevError.trim().length) {
                    job.prevError = `EMPTY ERROR CODE00000252 (hasError=${hasError}) ${JSON.stringify(prevError)}`;
                }
                state_Error(job);
                sch_Retry(job, prevError.message);
                info_Fail(job, hasError);
            }
            return;
        }
    } finally {
        job.jobContext.disableUnload--;
        JobResourcesRelease(
            job.jobStorage.jobResourcesCurrent,
            job.jobType.resources,
            job.jobStorage.jobResourcesDelays
        );
        job.jobStorage.updateJobState(job);
        job.jobStorage.my_console.log(
            `CODE00000072`,
            `${JSON.stringify((job.jobContext as any).issueKey)}.${job.jobType.type} - stopped ${
                successfulWithDeps ? "OK" : `ERROR ${job.prevError}`
            }!`
        );
        if (successfulWithDeps) await job.save(true);
        for (let handler of job.jobStorage.onJobStopHandlers) handler(job, "CODE00000206");
    }
}

//=================================== State START ==================================
function state_Starting(job: Job) {
    // GRP_job_ready_states
    job.touch();
    job.cancelled = false;
    job.running = true;
    job.succeded = false;
    //job.paused;                   // Shouldn't be changed here
    job.predecessors = new Map();
    // updateObservers(job);         //  Shouldn't be changed here
}

function state_Success(job: Job) {
    // GRP_job_ready_states
    job.touch();
    job.cancelled = false;
    job.running = false;
    job.succeded = true;
    //job.paused;                   // Shouldn't be changed here
    // job.predecessors = new Map();        //  Shouldn't be changed here
    notifySuccessors(job);
}

function state_Error(job: Job) {
    // GRP_job_ready_states
    job.touch();
    job.cancelled = false;
    job.running = false;
    job.succeded = false;
    //job.paused;                   // Shouldn't be changed here
    // job.predecessors = new Map();        //  Shouldn't be changed here
    // updateObservers(job);        //  Shouldn't be changed here
}

function state_RestartSoon(job: Job) {
    // GRP_job_ready_states
    job.touch();
    job.cancelled = false;
    job.running = false;
    job.succeded = false;
    //job.paused;                   // Shouldn't be changed here
    // job.predecessors = new Map();        //  Shouldn't be changed here
    // updateObservers(job);        //  Shouldn't be changed here
}

export function state_Stale(job: Job) {
    // GRP_job_ready_states
    job.touch();
    if (job.running) job.cancelled = true; // Else - not running - don't change anything
    job.succeded = false;
    //job.paused;                   // Shouldn't be changed here
    // job.predecessors = new Map();        //  Shouldn't be changed here - it's already set before call to this
    // updateObservers(job);        //  Shouldn't be changed here
}

//=================================== State END ====================================

//

//================================ Scheduling START ================================
export function sch_ClearNext(job: Job) {
    job.touch();
    job.nextRunTs = undefined;
    job.jobStorage.updateJobState(job);
}

function sch_SetNext(job: Job, nextRunTs: moment.Moment) {
    job.touch();
    job.nextRunTs = nextRunTs;
    job.jobStorage.updateJobState(job);
}

function sch_Success(job: Job) {
    job.touch();
    job.retryIntervalIndex = 0;
}

function sch_Retry(job: Job, errorMessage: string) {
    const r = job.jobStorage.onJobError?.(job, errorMessage);
    const retryInterval = retryIntervalByIndex(
        r && r.persistentError ? (job.retryIntervalIndex = 1000000) : job.retryIntervalIndex++
    );
    sch_SetNext(job, moment().add(retryInterval));
}

function sch_RetrySoon(job: Job) {
    sch_SetNext(job, moment().add(200));
}

//================================ Scheduling END ==================================

//

//================================ Info START ================================
function info_Starting(job: Job) {
    job.touch();
    // GRP_job_info_fields
    job.waitType = undefined;
    //job.prevError = undefined;
    job.setStep("CODE00000120", "Starting", undefined, "I");
}

function info_Success(job: Job) {
    job.touch();
    // GRP_job_info_fields
    job.waitType = undefined;
    job.prevError = undefined;
    job.setStep("CODE00000129", "Successful", undefined, "I", true);
}

function info_RestartSoon(job: Job) {
    job.touch();
    // GRP_job_info_fields
    job.waitType = undefined;
    job.setStep("CODE00000073", "Restart soon", undefined, "W", true);
}

function info_Fail(job: Job, hasError: false | string) {
    job.touch();
    // GRP_job_info_fields
    job.waitType = undefined;
    if (!hasError) job.prevError = "Cancelled";
    job.setStep("CODE00000074", hasError ? "Error" : "Cancelled", undefined, "E", true);
}

//================================ Info END ==================================
