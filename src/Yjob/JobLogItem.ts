import { JobWait } from "Yjob/JobWait";

export interface JobLogItem {
    cpl: string;
    message?: string;
    severity: string;
    jobId: string;
    type: string;
    step: string;
    prevError?: string;
    finished: 1 | 0;
    ready: 1 | 0;
    waitType: JobWait | undefined;
    project?: string; // wa
    issueKey?: string; // wa
}

export const jobListLogColumnStr: string = (function() {
    const s = `
    export interface JobLogItem {
        cpl: string;
        message?: string;
        severity: string;
        jobId: string;
        type: string;
        step: string;
        prevError?: string;
        finished: 1 | 0;
        ready: 1 | 0;
        waitType: JobWait | undefined;
        project?: string;// wa
        issueKey?: string;// wa
    }
        `;
    const r = s
        .trim()
        .split("\n")
        .map(line => line.split(":"))
        .filter(a => a.length === 2)
        .map(a => a[0].trim())
        .map(a => (a.endsWith("?") ? a.substr(0, a.length - 1) : a))
        .join(",");
    return r;
})();
