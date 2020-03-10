import { JobWait } from "./JobWait";

export interface JobStep {
    cpl: string;
    step: string;
    waitType: JobWait | undefined;
}
