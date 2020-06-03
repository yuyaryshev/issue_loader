import sortKeys from "sort-keys";
import { JobKey } from "./Job";
import { shortSelfOrsha256base64 } from "Ystd";

export function makeJobKey(type: string, input: any): JobKey {
    const inputStr = JSON.stringify(sortKeys(input, { deep: true }));
    if (!inputStr.length || inputStr === "{}") return type;
    return shortSelfOrsha256base64(type + ":" + inputStr);
}

export const makeJobContextKey = makeJobKey;
