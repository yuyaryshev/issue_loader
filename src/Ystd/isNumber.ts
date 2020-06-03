export function isNumber(v: any): v is number {
    return !isNaN(v);
}
