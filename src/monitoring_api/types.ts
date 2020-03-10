import { Env } from "other";

export interface Api {
    name: string;
    func: (env: Env) => Promise<void> | void;
}
