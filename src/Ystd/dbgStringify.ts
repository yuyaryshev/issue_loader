import { stringify } from "javascript-stringify";

export function dbgStringify(v: any): string {
    return stringify(v, undefined, "    ") || "undefined";
}
