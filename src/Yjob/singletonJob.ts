import { JobWait } from "Yjob/JobWait";

export interface SingletonJobStep {
    cpl: string;
    step: string;
    waitType: JobWait | undefined;
}

export interface StatusReporter {
    setStep: (cpl: string, step: string, waitType: JobWait | undefined) => void;
}

export type SingletonJobFunc<TEnv> = (statusReporter: StatusReporter) => void | Promise<void>;

export function singletonJob<TEnv>(env: TEnv, cpl: string, type: string, singletonFunc: SingletonJobFunc<TEnv>) {
    let currentStep;
    let steps = [];
    return singletonFunc({
        setStep: function setStep(cpl: string, step: string, waitType: JobWait | undefined) {
            const jobStep = { cpl, step, waitType };
            steps.push(jobStep);
            currentStep = jobStep;
            if ((env as any).onSingletonJobStep) (env as any).onSingletonJobStep(cpl, type, currentStep);
        },
    });
}
