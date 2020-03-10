//import { JobStatus } from 'Yjob';
import { LoadStreamStatus } from "../entry_scripts/run_refreshLoadStreams";

export interface IssueLoaderStatus {
    aggregatedStatus: "Ok" | "Error" | "Starting Up";
    jiraTime: string;
    //    jobs: JobStatus[];
    loadStreams: LoadStreamStatus[];
}

export function makeStatus(): IssueLoaderStatus {
    return {
        aggregatedStatus: "Starting Up",
        jiraTime: "",
        //        jobs: [],
        loadStreams: [],
    };
}
