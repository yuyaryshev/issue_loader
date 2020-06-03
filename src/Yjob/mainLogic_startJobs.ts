import { awaitDelay } from "Ystd";
import { JobStorage } from "Yjob/JobStorage";
import moment from "moment";
import { runJob, sch_ClearNext } from "Yjob/mainLogic_JobLifeCycle";
import { JobResourcesCheck, JobResourcesIsEmpty } from "Yjob/JobResources";
import { jobsRatio } from "Yjob/mainLogic_loadUnload";

export async function startJobs(jobStorage: JobStorage<any, any, any, any, any>) {
    L_outter: while (true) {
        let ts = moment();
        let noResources = JobResourcesIsEmpty(jobStorage.jobResourcesCurrent);
        jobStorage.haveNewSavesFlag = false;

        for (let startLock of jobStorage.startLocks) jobStorage.testNewStartsLock(startLock);

        // Pick next jobs ready to run and run them
        let startedCount = 0;
        if (
            jobStorage.startLocks.size <= 0 &&
            !jobStorage.unloading &&
            !noResources &&
            jobStorage.readyToRunJobContexts.length
        )
            for (let i = 0; i < (jobStorage.regularFuncBulk || 1); i++) {
                for (let jobContext of jobStorage.readyToRunJobContexts) {
                    // let succededCount = 0;
                    // for (let job of jobContext.jobsArray())
                    //     if (job.jobType.type === "transformIssue" && job.succeded) {
                    //     console.log(`CODE00000279 DELETE_THIS transformIssue - FINISHED OK!`);
                    // }
                    for (let job of jobContext.jobsArray()) {
                        if (job.state !== "waitingDeps")
                            if (job.state !== "readyToRun")
                                // WA_DEPS_NOT_WORKING - вместо predecessors используется stage - удалить всю эту строку после исправления!
                                continue;
                        if (job.jobType.stage !== jobContext.stage) continue; // WA_DEPS_NOT_WORKING - вместо predecessors используется stage - удалить всю эту строку после исправления!

                        if (!JobResourcesCheck(jobStorage.jobResourcesCurrent, job.jobType.resources)) continue;

                        if (jobStorage.startLocks.size <= 0) runJob(job);
                        if (jobStorage.closing) return;
                    }
                }
            }

        // Check if next jobContexts waiting for time is ready, if so - move them to "Ready" container
        const nextWaitingJobContext = jobStorage.waitingTimeJobContexts[0];
        if (nextWaitingJobContext && ts.diff(nextWaitingJobContext.nextRunTs) > 0) {
            for (let job of nextWaitingJobContext.jobsArray()) {
                if (job.nextRunTs && job.nextRunTs.diff(ts) < 0) {
                    sch_ClearNext(job);
                    jobStorage.updateJobState(job);
                    if (jobStorage.closing) return;
                    if (!startedCount && !noResources) continue L_outter;
                }
                if (jobStorage.closing) return;
            }
        }
        if (jobStorage.closing) return;

        if (!startedCount) {
            jobStorage.my_setTimeout(
                jobStorage.startRegularFunc,
                jobStorage.regularFuncMaxTimeout,
                jobStorage.env,
                `CODE00000275`,
                `JobStorage.startRegularFunc`
            );
            return;
        }
        if (jobStorage.regularFuncMinTimeout) await awaitDelay(jobStorage.regularFuncMinTimeout);
        if (jobStorage.closing) return;
    }
}
