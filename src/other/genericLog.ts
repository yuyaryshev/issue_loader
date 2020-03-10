export interface GenericLogItem {
    ts: string;
    cpl: string;
    severity: string;
    prefix: string;
    message: string;
    data: string;
}

export const genericLogColumnStr: string = (function() {
    const s = `
    export interface GenericLogItem {
        ts:string;
        cpl:string;
        severity: string;
        prefix:string;
        message: string;
        data: string;
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
