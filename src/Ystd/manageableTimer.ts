import moment from "moment";

export interface EnvWithTimers {
    timers: Set<ManageableTimer>;
}

export interface ManageableTimer<Env extends EnvWithTimers = EnvWithTimers> {
    env: Env;
    cpl: string;
    name: string;
    lastRun?: moment.Moment;
    timeout: number;
    disabled?: boolean;
    timeoutHandle?: any;

    stop: () => void;
    cancel: () => void;
    setTimeout: () => void;
    setInterval: () => void;
    notSoonerThan: () => undefined | Promise<void>;
    disable: () => void;
    enable: () => void;
    executeNow: () => Promise<void>;
}

export function manageableTimer<Env extends EnvWithTimers = EnvWithTimers>(
    env: Env,
    timeout: number,
    cpl: string,
    name: string,
    callback: () => void | Promise<void>
) {
    async function directRun() {
        pthis.lastRun = moment();
        try {
            await callback();
        } catch (e) {
            pthis.lastRun = moment();
            console.error(`CODE00000247`, `Unhandled exception in timer!`);
        }
    }

    function stop() {
        if (pthis.timeoutHandle) {
            clearTimeout(pthis.timeoutHandle);
            delete pthis.timeoutHandle;
            env?.timers.delete(pthis);
        }
    }

    function mSetTimeout() {
        if (!env) throw new Error(`${cpl} ERROR Can't start timer because 'env' is empty!`);
        stop();
        if (pthis.disabled) return;
        env.timers.add(pthis);
        pthis.timeoutHandle = setTimeout(async () => {
            stop();
            await directRun();
        }, timeout);
    }

    function mSetInterval() {
        if (!env) throw new Error(`${cpl} ERROR Can't start timer because 'env' is empty!`);
        stop();
        if (pthis.disabled) return;
        env.timers.add(pthis);
        pthis.timeoutHandle = setInterval(async () => {
            await directRun();
        }, timeout);
    }

    async function executeNow() {
        stop();
        await directRun();
    }

    function notSoonerThan(): undefined | Promise<void> {
        if (!pthis.lastRun || moment().diff(pthis.lastRun) > timeout) return executeNow();
        return undefined;
    }

    function disable() {
        pthis.disabled = true;
        stop();
    }

    function enable() {
        delete pthis.disabled;
    }

    const pthis: ManageableTimer<Env> = {
        env,
        cpl,
        name,
        timeout,
        stop,
        cancel: stop,
        setTimeout: mSetTimeout,
        setInterval: mSetInterval,
        disable,
        enable,
        executeNow,
        notSoonerThan,
    };

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
    return manageableTimer(env, timeout, cpl, name, callback).setTimeout();
}

// Синоним. Но список параметров совместим со стандартным setTimeout
export function manageableSetInterval<Env extends EnvWithTimers = EnvWithTimers>(
    callback: () => void | Promise<void>,
    timeout: number,
    env: Env,
    cpl: string,
    name: string
) {
    return manageableTimer(env, timeout, cpl, name, callback).setInterval();
}
