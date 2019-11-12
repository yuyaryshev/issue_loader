// import { join as joinPath, sep as pathSep } from "path";
import commander from "commander";
import { deploy } from "./deploy";
import { run } from "./run";
import { runReload } from "./reload";
import { debugfm } from "./debugfm";
import { drop_all } from "./drop_all";
import { startEnv } from "./startEnv";
import {globalHandler} from "./globalHandler";

const program = new commander.Command();

program.version("0.0.1").description("This program replicates issues from Jira to OracleDB");
program
    .command("init")
    .description("Creates an example settings file")
    .action(globalHandler(function() {
        // TODO_NEXT init - not implemented
        throw new Error(`init - not implemented`);
    }));

program
    .command("deploy")
    .description("Applies changes to loading scheme: fields of issues being loaded, filters, etc.")
    .action(globalHandler(async function() {
        await deploy();
    }));

program
    .command("drop_all")
    .description("WITHOUT ANY CONFIRMATION: Drops all tables, stored procedures and other objects created by issue_loader. WARNING: permanently destroys all data and settings.")
    .action(globalHandler(async function() {
        await drop_all();
    }));

program
    .command("run")
    .description("Replicates issues from Jira to OracleDB.")
    .action(globalHandler(async function() {
        await run(program);
    }));

program
    .command("reload")
    .option("-p, --projects", "Comma separated list of projects to be reloaded. Default = all projects.")
    .description("Reloads all issues FROM CACHE. Useful for changing fields being loaded from Jira")
    .action(globalHandler(async function() {
        await runReload(program);
    }));

program
    .command("debugfm")
    .option("-f, --flush", "Deletes all cache files.")
    .description("DEVELOPER MODE - used for debugging function which converts Jira-JSON into JIRA_ISSUES Oracle row.")
    .action(globalHandler(async function() {
        await debugfm(program.f);
    }));

program.on("command:*", function(command: string) {
    const firstCommand = command[0];
    // @ts-ignore
    if (!this.commands.find(c => c._name == firstCommand)) {
        console.error(
            "Invalid command: %s\nSee --help for a list of available commands.",
            program.args.join(" ")
        );
        process.exit(1);
    }
});

if (process.argv.length <= 2) process.argv.push("--help");
program.parse(process.argv);
