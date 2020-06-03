import { readFileSync, writeFileSync } from "fs";
import { startEnv } from "../other/Env";
import {
    dbdJiraIssueInput,
    dbdJiraIssueInputLog,
    dbg_fieldMapper_path,
    makeDatetimeWalkerSource,
    makeFieldMapperSource,
    prepareDbDomain,
    readDJiraFieldMarkedMeta,
} from "dbDomains";
import { debugMsgFactory, deleteFileIfExists, writeFileSyncIfChanged, yconsole } from "Ystd";
import { OracleConnection0 } from "Yoracle";

const debug = debugMsgFactory("debugfm");
const debugSql = debugMsgFactory("sql");
const debugRefreshStreams = debugMsgFactory("debugfm.loadStreams");
const debugWorkCycle = debugMsgFactory("debugfm.workCycle");
const cleanDeep = require("clean-deep");

export const debugfm = async function(clearCaches: boolean) {
    const env = await startEnv("debugfm", { noJiraTest: true, noDbTest: true });
    yconsole.log(`CODE00000044`, `Starting 'debugfm'...`);

    if (env.settings.debug.clearCaches || clearCaches) {
        deleteFileIfExists("dbg_jira_fields.json");
        deleteFileIfExists("dbg_issue.json");
        deleteFileIfExists("dbg_fieldMapperResult.json");
        deleteFileIfExists("dbg_fieldMapper.js");
        yconsole.log(`CODE00000045`, `Cleared all caches...`);
    }

    yconsole.log(`CODE00000046`, `Loading markedFields`);
    let markedFields: any;
    try {
        markedFields = JSON.parse(readFileSync("./dbg_jira_fields.json", "utf-8"));
    } catch (e) {
        const dbdJiraIssue = await env.dbProvider(async function(db: OracleConnection0) {
            markedFields = await readDJiraFieldMarkedMeta(db, env.settings.tables.CURRENT_JIRA_FIELD_T, false, true);
            writeFileSync("./dbg_jira_fields.json", JSON.stringify(markedFields, undefined, "    "), "utf-8");
        });
    }

    const issueKey = env.settings.debug.issueKey;
    yconsole.log(`CODE00000047`, `Loading issue '${issueKey}'`);
    let issue: any;
    try {
        issue = JSON.parse(readFileSync("./dbg_issue.json", "utf-8"));
    } catch (e) {
        issue = await env.jira.getIssueByKey({ issueKey });
        writeFileSync("./dbg_issue.json", JSON.stringify(issue, undefined, "    "), "utf-8");
    }

    yconsole.log(`CODE00000048`, `Initializing dbdJiraIssue...`);
    const dbdJiraIssue = env.settings.write_into_log_tables
        ? prepareDbDomain(env.settings, dbdJiraIssueInputLog(markedFields))
        : prepareDbDomain(env.settings, dbdJiraIssueInput(markedFields));

    yconsole.log(`CODE00000049`, `Generating fieldMapperSource...`);
    const fieldMapperSource = makeFieldMapperSource(markedFields);
    const datetimeWalkerSource = makeDatetimeWalkerSource(markedFields);

    yconsole.log(`CODE00000050`, `Loading fieldMapperSource from ${dbg_fieldMapper_path}...`);
    // @ts-ignore
    const fieldMapper = require(dbg_fieldMapper_path).fieldMapper;
    yconsole.log(`CODE00000051`, `Loaded fieldMapperSource - OK`);

    yconsole.log(`CODE00000052`, `Applying fieldMapper to issue '${issueKey}'`);
    const fieldMapperResult = fieldMapper(issue);
    yconsole.log(`CODE00000053`, `Applying fieldMapper to issue '${issueKey}' - OK`);

    yconsole.log(`CODE00000054`, `Generating JSON string from fieldMapperResult...`);
    const resultJson = JSON.stringify(fieldMapperResult, undefined, "    ");

    yconsole.log(`CODE00000055`, `Writing JSON string to ${"./dbg_fieldMapperResult.json"}...`);
    writeFileSyncIfChanged("./dbg_fieldMapperResult.json", resultJson);
    yconsole.log(`CODE00000056`, `Writing JSON string to ${"./dbg_fieldMapperResult.json"} - OK`);

    yconsole.log(`CODE00000057`, `Finished 'debugfm' - OK`);
};
