import { join as joinPath, sep as pathSep } from "path";
import { startup } from "./ycplmonLib";

import commander from "commander";

const program = new commander.Command();

program
    .version("1.0.0")
    .option("-w, --watch", "Watch for changes. Warning: loses changes if used with WebStorm!")
    .option("-r, --rebuild", "Rebuild the database")
    .option("-db, --dbpath", "Custom path for the database")
    .option("-nodb, --nodb", `Don't use database`)
    .option("-i --interval", "Interval in seconds before watch notification, default 10 seconds")
    .command("* <path>")
    .description("Starts watching path for cpl changes and handles them")
    .action(function(targetPath) {
        startup({
            dbPath: program.dbPath || joinPath(targetPath, `cpl.db`),
            srcPath: targetPath,
            rebuildDb: program.rebuild,
            watch: program.nowatch,
            interval: program.interval,
            noDb: program.nodb || true,
            logEachFixedFile: true,
        });
    });
program.parse(process.argv);
