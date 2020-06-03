import { Job, JobDependencyItem, JobId } from "Yjob/Job";
import { state_Stale } from "Yjob/mainLogic_JobLifeCycle";

export function hasSuccessor(predecessor: Job, successorId: JobId) {
    for (let s of predecessor.successors)
        if (s === successorId || (Array.isArray(s) && s[1] === successorId)) return true;
    return false;
}

export function setPredecessor(predecessor: Job, successor: Job) {
    //result: predecessor.succeded ? (predecessor.jobStorage.loadJobResult(predecessor.jobStorage.selectResultForJob.iterate(predecessor.id), predecessor) as any)?.result : undefined,
    if (!predecessor.result && predecessor.needToLoad) {
        predecessor.result = predecessor.jobStorage.loadResult(
            predecessor.jobStorage.selectResultForJob.iterate(predecessor.id)
        );
        predecessor.needToLoad = false;
    }
    let depRecord: JobDependencyItem = {
        succeded: predecessor.succeded,
        id: successor.id,
        result: predecessor.succeded ? predecessor.result : undefined,
    };

    if (predecessor.jobContext === successor.jobContext) {
        if (!hasSuccessor(predecessor, successor.id)) predecessor.successors.push(successor.id);
        successor.predecessors.set(predecessor.id, depRecord);
    } else {
        if (!hasSuccessor(predecessor, successor.id))
            predecessor.successors.push([successor.jobContext.id, successor.id]);
        depRecord.jobContextId = predecessor.jobContext.id;
        successor.predecessors.set(predecessor.id, depRecord);
    }
}

export const checkPredecessors = (job: Job) => {
    try {
        for (let [, predecessor] of job.predecessors)
            if (!predecessor.succeded) {
                // If so, the result is stale
                job.predecessorsDone = false;
                return false;
            }
        job.predecessorsDone = true;
    } catch (e) {
        console.log("CHECKPREDESSSSSORS ERROR" + e);
    }
    return true;
};

export const notifySuccessors = (predecessor: Job) => {
    for (let successorItem of predecessor.successors) {
        const successorJob =
            typeof successorItem === "number"
                ? predecessor.jobContext.getJobById(successorItem)
                : Array.isArray(successorItem)
                ? predecessor.jobStorage.findJobById(successorItem[0], successorItem[1])
                : undefined;

        if (!(typeof successorItem === "number") && !Array.isArray(successorItem))
            throw new Error(`PREDECESSOR ERROR ${successorItem}!`);

        if (successorJob) {
            if (!predecessor.result && predecessor.needToLoad) {
                predecessor.result = predecessor.jobStorage.loadResult(
                    predecessor.jobStorage.selectResultForJob.iterate(predecessor.id)
                );
                predecessor.needToLoad = false;
            }
            predecessor.predecessors.set(predecessor.id, {
                id: predecessor.id,
                succeded: predecessor.succeded,
                result: predecessor.succeded && predecessor.result,
            });
            if (checkPredecessors(successorJob)) {
                state_Stale(successorJob);
                successorJob.jobStorage.updateJobState(successorJob);
            }
        }
    }
};
