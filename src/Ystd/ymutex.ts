import { awaitDelay } from "./awaitDelay";

export type YSemaphore = {
    lockCount: number;
    lockCountNow: number;
    lock: <T>(asyncCallback: () => Promise<T>) => Promise<T>;
};

export function ysemaphore(n: number = 1, releaseDelay: number = 0): YSemaphore {
    let m = {
        lockCount: 0,
        lockCountNow: 0,
        lock: async function(asyncCallback: () => Promise<any>, count: number = 1) {
            while (m.lockCount + count > n && m.lockCount) await awaitDelay(100);

            let r: any;
            m.lockCount += count;
            m.lockCountNow += count;

            try {
                r = await asyncCallback();
            } finally {
                m.lockCountNow -= count;
                if (releaseDelay > 0)
                    (async () => {
                        await awaitDelay(releaseDelay);
                        m.lockCount -= count;
                    })();
                else m.lockCount -= count;
            }
            return r;
        },
    } as YSemaphore;
    return m;
}

export const ymutex = ysemaphore;
