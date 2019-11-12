import { writeFileSync,readFileSync, unlinkSync } from "fs";
import { startEnv, OracleConnection, Env } from "./startEnv";
import { makeCreateIssueTableSql, makeMergeProc } from "./generateSql";
import { readDJiraFieldMarkedMeta, DJiraFieldMarkedMeta, enrichAndValidateDJiraFieldMarked } from "./dbdJiraField";
import { executeIfExists, tableExists, renameTable } from "./oracleFuncs";
import { loadJiraFields } from "./loadJiraFields";
import { dbdJiraIssueInput, makeFieldMapperSource as makeFieldMapperSource,makeDatetimeWalkerSource as makeDatetimeWalkerSource, dbg_fieldMapper_path, dbg_datetimeWalker_path } from "./dbdJiraIssue";
import { prepareDbDomain } from "./dbDomain";
import deepEqual from "fast-deep-equal";
import { mockableRequest } from "./mockableRequest";
import { LoadStreams, decoderLoadStream } from "./dbdLoadStream";
import { yconsole, debugMsgFactory } from "./consoleMsg";
import { resolve, join } from "path";
import {writeFileSyncIfChanged} from "./writeFileSyncIfChanged";
import {deleteFileIfExists} from "./deleteFileIfExists";

const debug = debugMsgFactory("debugfm");
const debugSql = debugMsgFactory("sql");
const debugRefreshStreams = debugMsgFactory("debugfm.loadStreams");
const debugWorkCycle = debugMsgFactory("debugfm.workCycle");
const cleanDeep = require("clean-deep");

export const debugfm = async function(clearCaches: boolean) {
    const env = await startEnv("debugfm", {noJiraTest:true, noDbTest: true});
    yconsole.log(`T7501`, `Starting 'debugfm'...`);

    if(env.settings.debug.clearCaches || clearCaches) {
        deleteFileIfExists("dbg_jira_fields.json");
        deleteFileIfExists("dbg_issue.json");
        deleteFileIfExists("dbg_fieldMapperResult.json");
        deleteFileIfExists("dbg_fieldMapper.js");
        yconsole.log(`T7555`, `Cleared all caches...`);
    }

    yconsole.log(`T7502`, `Loading markedFields`);
    let markedFields: any;
    try {
        markedFields = JSON.parse(readFileSync("./dbg_jira_fields.json", "utf-8"));
    } catch (e) {
        const dbdJiraIssue = await env.dbProvider(async function(db: OracleConnection) {
            markedFields = await readDJiraFieldMarkedMeta(db, env.settings.tables.CURRENT_JIRA_FIELD, false, true);
            writeFileSync("./dbg_jira_fields.json", JSON.stringify(markedFields, undefined, "    "), "utf-8");
        });
    }

    const issueKey = env.settings.debug.issueKey;
    yconsole.log(`T7503`, `Loading issue '${issueKey}'`);
    let issue: any;
    try {
        issue = JSON.parse(readFileSync("./dbg_issue.json", "utf-8"));
    } catch (e) {
        issue = await env.jira.getIssue({issueKey});
        writeFileSync("./dbg_issue.json", JSON.stringify(issue, undefined, "    "), "utf-8");
    }

    yconsole.log(`T7504`, `Initializing dbdJiraIssue...`);
    const dbdJiraIssue = prepareDbDomain(env.settings, dbdJiraIssueInput(markedFields));

    yconsole.log(`T7505`, `Generating fieldMapperSource...`);
    const fieldMapperSource = makeFieldMapperSource(markedFields);
    const datetimeWalkerSource = makeDatetimeWalkerSource(markedFields);

    yconsole.log(`T7506`, `Loading fieldMapperSource from ${dbg_fieldMapper_path}...`);
    // @ts-ignore
    const fieldMapper = require(dbg_fieldMapper_path).fieldMapper;
    yconsole.log(`T7507`, `Loaded fieldMapperSource - OK`);

    yconsole.log(`T7508`, `Applying fieldMapper to issue '${issueKey}'`);
    const fieldMapperResult = fieldMapper(issue);
    yconsole.log(`T7509`, `Applying fieldMapper to issue '${issueKey}' - OK`);

    yconsole.log(`T7510`, `Generating JSON string from fieldMapperResult...`);
    const resultJson = JSON.stringify(fieldMapperResult, undefined, "    ");

    yconsole.log(`T7511`, `Writing JSON string to ${"./dbg_fieldMapperResult.json"}...`);
    writeFileSyncIfChanged("./dbg_fieldMapperResult.json", resultJson);
    yconsole.log(`T7511`, `Writing JSON string to ${"./dbg_fieldMapperResult.json"} - OK`);
    
    yconsole.log(`T7590`, `Finished 'debugfm' - OK`);
};
