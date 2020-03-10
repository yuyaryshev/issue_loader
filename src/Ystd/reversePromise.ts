export interface ReversePromise {
    cpl?: string;
    c: number;
    e?: Error;
    resolveItem: () => void;
    rejectItem: (e: Error) => void;
    promise: Promise<void>;
    resolvePromise: () => void;
    rejectPromise: (e: Error) => void;
}

export interface MakePromiseVoid {
    promise: Promise<void>;
    resolve: () => void;
    reject: (e: Error) => void;
}

export interface MakePromise<T> {
    promise: Promise<T>;
    resolve: (v: T) => void;
    reject: (e: Error) => void;
}

export const makePromiseVoid = () => {
    const pthis: MakePromiseVoid = {
        promise: undefined as any,
        resolve: undefined as any,
        reject: undefined as any,
    };
    pthis.promise = new Promise((resolve, reject) => {
        pthis.resolve = resolve;
        pthis.reject = reject;
    });
    return pthis;
};

export const makePromise = <T>() => {
    const pthis: MakePromise<T> = {
        promise: new Promise<T>((resolve, reject) => {
            pthis.resolve = resolve;
            pthis.reject = reject;
        }),
        resolve: undefined as any,
        reject: undefined as any,
    };
    return pthis;
};

export const reversePromise = (c: number, cpl?: string) => {
    const pthis: ReversePromise = {
        c,
        promise: undefined as any,
        resolvePromise: undefined as any,
        rejectPromise: undefined as any,
        resolveItem: function resolveItem() {
            pthis.c--;
            if (c <= 0) {
                if (pthis.e) pthis.rejectPromise(pthis.e);
                else pthis.resolvePromise();
            }
        },
        rejectItem: function rejectItem(e: Error) {
            c--;
            if (!pthis.e) pthis.e = e;
            if (c <= 0) {
                if (pthis.e) pthis.rejectPromise(pthis.e);
                else pthis.resolvePromise();
            }
        },
    };

    pthis.promise = new Promise<void>((resolve, reject) => {
        pthis.resolvePromise = resolve;
        pthis.rejectPromise = reject;
    });
    return pthis;
};

export const reversePromiseResolveItem = (reversePromise: ReversePromise | undefined) => {
    if (reversePromise) reversePromise.resolveItem();
};

export const reversePromiseRejectItem = (reversePromise: ReversePromise | undefined, e: Error) => {
    if (reversePromise) reversePromise.rejectItem(e);
    else throw e;
};
