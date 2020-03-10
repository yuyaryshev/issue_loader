export function sorterFuncSrc(fields: string | string[]) {
    let s = "0";
    if (!Array.isArray(fields)) fields = [fields];

    for (let field of fields) {
        s = `(a.${field} < b.${field} ? -1 : a.${field} > b.${field} ? 1 : ${s})`;
    }

    return `(a,b)=>${s}`;
}

export function sorterFunc(fields: string | string[]) {
    return eval(sorterFuncSrc(fields));
}

export function sortObjects(objectsArray: any[], fields: string | string[]) {
    objectsArray.sort(sorterFunc(fields));
    return objectsArray;
}
