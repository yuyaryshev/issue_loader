const runOnceSet: Set<any> = new Set();

export function runOnce(key: any, delay: number = 0, callback: (key: any) => Promise<void> | void) {
    if (!runOnceSet.has(key)) {
        runOnceSet.add(key);
        setTimeout(async function() {
            try {
                await callback(key);
            } catch (e) {
                console.error(`Exception in runOnce`, e);
            }
            runOnceSet.delete(key);
        }, delay);
    }
}
