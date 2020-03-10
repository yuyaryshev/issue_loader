import { run } from "./entry_scripts/run";
import { globalHandler } from "Ystd";

globalHandler(async function(args?: any) {
    await run(args);
})();
