// import { join as joinPath, sep as pathSep } from "path";
import commander from "commander";
import { deploy } from "./entry_scripts/deploy";
import { run } from "./entry_scripts/run";
import { runReload } from "./entry_scripts/reload";
import { debugfm } from "./entry_scripts/debugfm";
import { drop_all } from "./entry_scripts/drop_all";
import { globalHandler } from "Ystd";

const program = new commander.Command();

program.version("0.0.1").description("This program replicates issues from Jira to OracleDB");
program
    .command("init")
    .description("Creates an example settings file")
    .action(
        globalHandler(function(args?: any) {
            // TODO_NEXT init - not implemented
            throw new Error(`init - not implemented`);
        })
    );

program
    .command("deploy")
    .option("-dr, --devredeploy", "Development only. Redeploy some tables.")
    .description("Drops and recreates some tables.")
    .action(
        globalHandler(async function(args?: any) {
            await deploy(args);
        })
    );

program
    .command("drop_all")
    .description(
        "WITHOUT ANY CONFIRMATION: Drops all tables, stored procedures and other objects created by issue_loader. WARNING: permanently destroys all data and settings."
    )
    .action(
        globalHandler(async function(args?: any) {
            await drop_all();
        })
    );

program
    .command("run")
    .option("--cleanStart", "Deletes stg and log sqlite databases on start")
    .option("-debug, --debugMode", "Debug mode: will pause all jobs and disable some background activity")
    .option("--disableRefresh", "Disables periodic refresh based on load_streams_t table")
    .option(
        "--dbgReloadProjects <items>",
        "Reloads specified project once on start, ignoring load_stream. Specify projects like this: '--dbgReloadProjects=PROJECT1,PROJECT2'"
    )
    .description("Replicates issues from Jira to OracleDB.")
    .action(
        globalHandler(async function(args?: any) {
            await run(args);
        })
    );

program
    .command("reload")
    .option("-p, --projects", "Comma separated list of projects to be reloaded. Default = all projects.")
    .description("Reloads all issues FROM CACHE. Useful for changing fields being loaded from Jira")
    .action(
        globalHandler(async function(args?: any) {
            await runReload(args);
        })
    );

program
    .command("debugfm")
    .option("-f, --flush", "Deletes all cache files.")
    .description("DEVELOPER MODE - used for debugging function which converts Jira-JSON into ISSUE_TS Oracle row.")
    .action(
        globalHandler(async function(args?: any) {
            await debugfm(args.f);
        })
    );

program.on("command:*", function(command: string) {
    const firstCommand = command[0];
    // @ts-ignore
    if (!this.commands.find(c => c._name == firstCommand)) {
        console.error("Invalid command: %s\nSee --help for a list of available commands.", program.args.join(" "));
        process.exit(1);
    }
});

if (process.argv.length <= 2) process.argv.push("--help");
program.parse(process.argv);
