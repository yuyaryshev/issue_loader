import { JobWait } from "./JobWait";
import { Severity } from "Ystd";

export interface JobStep {
    cpl: string;
    step: string;
    waitType: JobWait | undefined;
    severity: Severity;
    finished?: boolean;
}
