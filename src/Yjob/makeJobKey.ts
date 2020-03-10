import sortKeys from "sort-keys";
import { JobType } from "./JobType";
import { JobKey } from "./Job";
import { shortSelfOrsha256base64 } from "Ystd";

export function makeJobKey(jobType: JobType, input: any): JobKey {
    return shortSelfOrsha256base64(jobType.type + ":" + JSON.stringify(sortKeys(input, { deep: true })));
}
