export interface JobResources {
    [key: string]: number;
}

export function JobResourcesClear(target: JobResources) {
    for (let k in target) target[k] = 0;
}

export function JobResourcesAdd(target: JobResources, source: JobResources) {
    for (let k in source) target[k] = (target[k] || 0) + source[k];
}
export function JobResourcesCheck(storage: JobResources, job: JobResources) {
    for (let k in job) {
        if (job[k] > (storage[k] || 0)) return false;
    }
    return true;
}

export function JobResourcesIsEmpty(resources: JobResources) {
    for (let k in resources) if (resources[k] > 0) return false;
    return true;
}

export function JobResourcesAlloc(storage: JobResources, job: JobResources) {
    for (let k in job) storage[k] = (storage[k] || 0) - job[k];
}

export function JobResourcesCheckAndAlloc(storage: JobResources, job: JobResources) {
    const r = JobResourcesCheck(storage, job);
    if (!r) return false;
    JobResourcesAlloc(storage, job);
    return true;
}

export function JobResourcesRelease(storage: JobResources, job: JobResources, delays?: JobResources) {
    for (let k in job)
        if (!delays || !delays[k]) storage[k] = (storage[k] || 0) + job[k];
        else
            setTimeout(function delayedResourceRelease() {
                storage[k] = (storage[k] || 0) + job[k];
            }, delays[k]);
}
