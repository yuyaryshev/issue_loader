export interface JobLogItem {
    cpl: string;
    message: string;
    severity: string;
    jobId: string;
    type: string;
    name: string;
    createdTs: string;
    step: string;
    prevError?: string;
    finished: 1 | 0;
    ready: 1 | 0;
}

export const jobListLogColumnStr: string = (function() {
    const s = `
    export interface JobLogItem {
        cpl:string;
        message:string;
        severity:string;    
        jobId: string;
        type: string;
        name: string;
        createdTs: string;
        step: string;
        prevError?: string;
        finished: 1 | 0;
        ready: 1 | 0;
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
