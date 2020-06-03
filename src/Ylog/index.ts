import moment from "moment";
import { prefixSize, Severity, severityLongStr } from "Ystd";
const { performance } = require("perf_hooks");
const { AsyncLocalStorage } = require("async_hooks");

/*
Самый базовый вариант это:
- Все сообщения - логируем в RAM, затем - удаляем
- Все - запуски измеряем совокупную среднюю длительность
- Все входы и выходы - фиксируем выполняемые на данный момент и те что выполнялись недавно
*/

export function perfomanceToMoment(perfomanceTime: number): moment.Moment {
    return moment(performance.timeOrigin + performance.now());
}

export interface YlogMessage {
    t: "message";
    ylogFunction: YlogFunction;
    ts: number;
    cpl: string;
    severity: Severity;
    message: string;
    category?: string;
    data?: any;
}
export function isYlogMessage(a: any): a is YlogMessage {
    return a && a.t === "message";
}

export interface YlogStep {
    t: "step";
    ylogFunction: YlogFunction;
    index: number;
    ts: number;
    cpl: string;
    name: string;
    duration: number;
    data?: any;
    children?: YlogFunction[];
}
export function isYlogStep(a: any): a is YlogStep {
    return a && a.t === "step";
}

export const ylogFormatMsg = (m: YlogMessage) =>
    `${severityLongStr(m.severity)} ${m.cpl} ${m.ts} ${(
        (m.category && m.category.length ? m.category : m.ylogFunction.category) + "                             "
    ).substr(0, prefixSize)} - ${m.message}`;

export const ylogFormatStep = (m: YlogStep) =>
    `${severityLongStr("I")} ${m.cpl} ${m.ts} ${(m.ylogFunction.category + "                             ").substr(
        0,
        prefixSize
    )} - ${m.name}`;

const ylogLocalStorage = new AsyncLocalStorage();
ylogLocalStorage.enterWith({});

export class YlogFunction {
    public t: "function" = "function";
    public _data: any;
    public readonly messages: YlogMessage[] = [];
    public readonly steps: YlogStep[] = [];
    public branchCpl: string | undefined;
    public branchName: string | undefined;
    public branchPrimary: boolean | undefined;

    public readonly parent: YlogFunction | undefined;
    public readonly rootCpl: string | undefined;
    public hierarchyTypeKey: string;
    open?: boolean;

    constructor(
        public readonly cpl: string,
        public readonly name: string,
        public readonly category: string,
        opts?: any
    ) {
        this.step(cpl, "START");
        this.open = true;

        let localStore = ylogLocalStorage.getStore();
        if (!localStore) {
            localStore = {
                callStack: [this],
                rootCpl: cpl,
            };
            ylogLocalStorage.enterWith(localStore);
        } else {
            this.parent = localStore.callStack[localStore.callStack.length - 1];
            this.rootCpl = localStore.cpl;
            localStore.callStack.push(this);
        }
        this.hierarchyTypeKey = this.parent ? `${this.parent.hierarchyTypeKey}.${name}` : name;
    }

    // Дополняет данные на YlogFunction
    setData(v: any): YlogFunction {
        if (!this.open) this.ylogLogicViolation("CODE00000075", "YlogFunction is closed - can't change it!");

        this._data = Object.assign(this._data || {}, v);
        return this;
    }

    data() {
        return this._data || null;
    }

    // Переводит YlogFunction в следующий шаг
    step(cpl: string, name: string, stepData?: any): YlogFunction {
        if (!this.open) this.ylogLogicViolation("CODE00000076", "YlogFunction is closed - can't change it!");

        const s = {
            t: "step" as "step",
            ylogFunction: this,
            index: this.steps.length,
            cpl,
            name,
            ts: performance.now(),
            duration: 0,
            data: stepData,
        };
        this.steps.push(s);

        for (let listener of onYlogStep) listener(s);
        return this;
    }

    // Устанавливает завершение YlogFunction - по основному пути исполнения
    primaryBranch(cpl: string, name?: string): YlogFunction {
        if (!this.open) this.ylogLogicViolation("CODE00000077", "YlogFunction is closed - can't change it!");

        this.branchCpl = cpl;
        this.branchName = name || "primary";
        this.branchPrimary = true;
        return this;
    }

    // Устанавливает завершение YlogFunction - по побочному пути исполнения (exception и т.п.)
    sideBranch(cpl: string, name: string): YlogFunction {
        if (!this.open) this.ylogLogicViolation("CODE00000238", "YlogFunction is closed - can't change it!");

        this.branchCpl = cpl;
        this.branchName = name;
        this.branchPrimary = false;
        return this;
    }

    // Закрывает YlogFunction
    close(cpl: string): YlogFunction {
        if (!this.open) this.ylogLogicViolation("CODE00000239", "Can't close twice!");
        delete this.open;

        let localStore = ylogLocalStorage.getStore();
        if (!localStore || localStore.callStack.pop() !== this)
            this.ylogLogicViolation("CODE00000240", "Incorrect reference on stack, expected 'this'!");

        if (!this.branchCpl) this.sideBranch(cpl, "unknown");
        this.step(cpl, "END");

        Object.freeze(this);
        for (let k in this) if ((this as any)[k] && typeof (this as any)[k] === "object") Object.freeze(this);

        for (let listener of onYlogClosed) listener(this);
        return this;
    }

    // Сообщение о событии
    log(cpl: string, severity: Severity, message: string, category?: string, messageData?: any): YlogFunction {
        if (!this.open) this.ylogLogicViolation("CODE00000241", "YlogFunction is closed - can't change it!");

        const m: YlogMessage = {
            t: "message" as "message",
            ylogFunction: this,
            ts: performance.now(),
            cpl,
            severity,
            message,
            category,
            data: messageData,
        };

        if (messageData && messageData.toConsole) {
            if (messageData.trace) {
                console.trace(ylogFormatMsg(m));
            }

            switch (severity) {
                case "D":
                case "I":
                    console.log(ylogFormatMsg(m));
                    break;
                case "W":
                    console.warn(ylogFormatMsg(m));
                    break;
                case "E":
                case "F":
                    console.error(ylogFormatMsg(m));
                    break;
            }
        }

        this.messages.push(m);
        for (let listener of onYlogMessage) listener(m);
        return this;
    }

    // Сообщение об ошибке
    error(e: Error, messageData?: any): Error {
        if (!this.open) this.ylogLogicViolation("CODE00000242", "YlogFunction is closed - can't change it!");

        let cpl = e.message.startsWith("CODE") ? e.message.substr(0, 12) : undefined;
        let category = undefined;
        if (messageData) {
            if (messageData.cpl) {
                cpl = messageData.cpl;
                delete messageData.cpl;
            }

            if (messageData.category) {
                category = messageData.category;
                delete messageData.category;
            }

            if (!Object.keys(messageData).length) messageData = undefined;
        }

        if (cpl) (e as any).cpl = cpl;
        if (category) (e as any).category = category;
        if (messageData) (e as any).data = messageData;

        this.log(cpl || "CODE00000243", "E", e.message, category, messageData);
        return e;
    }

    ylogLogicViolation(cplDetector: string, message: string) {
        const cpl = this.cpl || "CODE_UNKNOWN";
        console.trace(`${cpl}-${cplDetector} ${message} - PROCESS TERMINATED!`);
        process.exit(1);
    }

    currentStep(): YlogStep {
        return this.steps[this.steps.length - 1]!;
    }

    addChild(child: YlogFunction) {
        const vStep = this.currentStep();
        if (!vStep.children) vStep.children = [child];
        else vStep.children.push(child);
    }

    attached<T>(cpl: string, callback: () => Promise<T>): Promise<T> {
        const r = callback();
        return r;
    }

    detached<T>(cpl: string, callback: () => Promise<T>): Promise<T> {
        return ylogLocalStorage.runSyncAndReturn({ callStack: [this], cpl }, () => {
            const r = callback();
            return r;
        });
    }
}

export type OnYlogClosedCallback = (ylogFunction: YlogFunction) => void;
export const onYlogClosed = new Set<OnYlogClosedCallback>();

export type OnYlogMessageCallback = (m: YlogMessage) => void;
export const onYlogMessage = new Set<OnYlogMessageCallback>();

export type OnYlogStepCallback = (s: YlogStep) => void;
export const onYlogStep = new Set<OnYlogStepCallback>();

export const ylogRoot = new YlogFunction("CODE00000244", "YlogRoot", "");

export function stepToStats(targetStat: any, step: any) {
    targetStat.count = (targetStat.count || 0) + 1;

    targetStat.duration = step.duration;
    if (targetStat.minDuration > step.duration) targetStat.minDuration = step.duration;

    if (targetStat.maxDuration < step.duration) targetStat.maxDuration = step.duration;

    targetStat.avgDuration = targetStat.duration / targetStat.count;
    targetStat.lastTs = step.ts;
}

export const basicStats: any = {};
export function basicStatsCounter(ylogFunction: YlogFunction) {
    let statsCounter = basicStats[ylogFunction.hierarchyTypeKey];
    if (!statsCounter)
        statsCounter = basicStats[ylogFunction.hierarchyTypeKey] = {
            cpl: ylogFunction.cpl,
            name: ylogFunction.name,
            branches: {},
            steps: [],
        };

    let statsBranchCounter = statsCounter.branches[ylogFunction.branchName!];
    if (!statsBranchCounter)
        statsBranchCounter = statsCounter.branches[ylogFunction.branchName!] = {
            cpl: ylogFunction.branchCpl,
            name: ylogFunction.branchName,
            primary: !!ylogFunction.branchPrimary,
        };

    let sz = ylogFunction.steps.length;
    for (let i = 0; i < sz - 1; i++) {
        const step = ylogFunction.steps[i];
        const nextStep = ylogFunction.steps[i + 1];
        step.duration = nextStep.ts - step.ts;

        let statStep = statsCounter.steps[step.index];
        if (!statStep)
            statStep = statsCounter.steps[step.index] = {
                cpl: step.cpl,
                name: step.name,
            };

        stepToStats(statsCounter.steps[step.index], step);
        stepToStats(basicStats[ylogFunction.hierarchyTypeKey], step);
        stepToStats(statsCounter.branches[ylogFunction.branchName!], step);
    }
}
onYlogClosed.add(basicStatsCounter);

export let basicLogLength = 100;
export const basicLog: any = [];
export function basicLogger(m: YlogMessage) {
    basicLog.push(m);
    if (basicLog.length > basicLogLength) basicLog.splice(0, basicLog.length - basicLogLength) > basicLogLength;
}
onYlogMessage.add(basicLogger);
