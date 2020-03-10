import { yconsole } from "./consoleMsg";

export const globalHandler = (callback: (args?: any) => void | Promise<void>) =>
    async function(args?: any) {
        try {
            await callback(args);
        } catch (e) {
            yconsole.fatal(`CODE00000278`, e);
        }
    };
