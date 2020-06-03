export type JobWait = "DbConn" | "DbResponse" | "JiraConn" | "JiraResponse" | "DebugAbandon";

export function JobWaitStr(step: JobWait) {
    switch (step) {
        case "DbConn":
            return "Waiting for free db job slot.";
        case "JiraConn":
            return "Waiting for free jira job slot.";
        case "JiraResponse":
            return "Waiting for Jira response.";
        case "DbResponse":
            return "Waiting for Db response.";
        case "DebugAbandon":
            return "The Job was not executed because debugAbandon was called for it.";
    }
    // @ts-ignore
    return step;
}
