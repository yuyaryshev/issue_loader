export function addToField(object: any, field: string, value: any) {
    if (object[field] === undefined) object[field] = value;
    else object[field] += value;
    return value;
}
