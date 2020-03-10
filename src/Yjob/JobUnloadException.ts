export class JobUnloadException extends Error {
    constructor(cpl: string) {
        super(cpl + " Unloading job because it's waiting too long");
    }
}
