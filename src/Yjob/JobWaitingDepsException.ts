export const JobWaitingDepsSymbol = Symbol("JobWaitingDepsSymbol");

export class JobWaitingDepsException extends Error {
    constructor(cpl: string) {
        super(cpl + " Unloading job because it's waiting too long");
    }
}
