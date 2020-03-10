export function containerAdd<T>(cont: T[] | Set<T>, value: T): T | undefined {
    if (Array.isArray(cont)) {
        if (!cont.includes(value)) {
            cont.push(value);
            return value;
        }
    } else {
        cont.add(value);
    }
    return undefined;
}

export function containerDelete<T>(cont: T[] | Set<T> | undefined, value: T): T | undefined {
    if (!cont) return undefined;

    if (Array.isArray(cont)) {
        const index = cont.indexOf(value);
        if (index >= 0) return cont.splice(index, 1)[0];
    } else {
        cont.delete(value);
    }
    return undefined;
}

export interface ObjectWithCont<T> {
    container: T[] | Set<T> | undefined;
}

export function moveToContainer<T extends ObjectWithCont<T>>(cont: T[] | Set<T> | undefined, value: T) {
    if (value && value.container) containerDelete(value.container, value);
    if (cont) {
        value.container = cont as T[] | Set<T>;
        containerAdd(cont, value);
    }
}
