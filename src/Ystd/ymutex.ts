import { awaitDelay } from "./awaitDelay";

export type YSemaphore = {
    lock: <T>(asyncCallback: () => Promise<T>) => Promise<T>;
};

export function ysemaphore(n: number = 1): YSemaphore {
    let lockCount = 0;
    let m = {
        lock: async function(asyncCallback: () => Promise<any>, count: number = 1) {
            while (lockCount + count > n && lockCount) await awaitDelay(100);

            let r: any;
            lockCount += count;

            try {
                r = await asyncCallback();
            } finally {
                lockCount -= count;
            }

            return r;
        },
    } as YSemaphore;
    return m;
}

export const ymutex = ysemaphore;
