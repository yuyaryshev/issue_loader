import { yconsole } from "./consoleMsg";

export const globalHandler = (callback: () => void | Promise<void>) => async function() {
    try {
        await callback();
    } catch (e) {
        yconsole.fatal(e);
    }
};
