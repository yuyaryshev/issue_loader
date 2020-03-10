export interface EnvWithTimers {
    timers: Set<ManageableTimer>;
}

export interface ManageableTimer<Env extends EnvWithTimers = EnvWithTimers> {
    env: Env;
    cpl: string;
    name: string;
    timeout: number;
    removed: boolean;
    start: () => void;
    remove: () => void;
    cancel: () => void;
    timeoutHandle: any;
}

export function manageableTimer<Env extends EnvWithTimers = EnvWithTimers>(
    env: Env,
    timeout: number,
    cpl: string,
    name: string,
    callback: () => void | Promise<void>
) {
    const pthis: ManageableTimer<Env> = {
        env,
        cpl,
        name,
        timeout,
        removed: false,
        timeoutHandle: undefined,
        cancel: () => {
            pthis.remove();
        },
        remove: () => {
            pthis.removed = true;
            if (pthis.timeoutHandle) clearTimeout(pthis.timeoutHandle);
            env?.timers.delete(pthis);
        },
        start: () => {
            if (!env) throw new Error(`${cpl} ERROR Can't start timer because 'env' is empty!`);
            env.timers.add(pthis);
            pthis.timeoutHandle = setTimeout(async () => {
                if (!pthis.removed) await callback();
                pthis.remove();
            }, timeout);
        },
    };

    pthis.start();
    return pthis;
}

// Синоним. Но список параметров совместим со стандартным setTimeout
export function manageableSetTimeout<Env extends EnvWithTimers = EnvWithTimers>(
    callback: () => void | Promise<void>,
    timeout: number,
    env: Env,
    cpl: string,
    name: string
) {
    return manageableTimer(env, timeout, cpl, name, callback);
}
