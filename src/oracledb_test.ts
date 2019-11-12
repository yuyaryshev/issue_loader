// myscript.js
// This example uses Node 8's async/await syntax.

import oracledb from "oracledb";
import { startEnv, OracleConnection, Env } from "./startEnv";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function run() {
    const env = await startEnv("test", {noJiraTest: true, noDbTest: false});

    let db;
    try {
        //T17:45:08.769+0300
        //"T"hh24:mi:ss.ffTZHTZM
        db = await oracledb.getConnection(env.settings.oracle);
        await db.execute(`alter session set NLS_TIME_FORMAT='HH24:MI:SSXFF'`);        
        await db.execute(`alter session set NLS_TIMESTAMP_FORMAT='YYYY-MM-DD"T"hh24:mi:ss.ff'`);        
        await db.execute(`alter session set NLS_TIME_TZ_FORMAT='HH24:MI:SSXFF TZR'`);        
        await db.execute(`alter session set NLS_TIMESTAMP_TZ_FORMAT='YYYY-MM-DD"T"hh24:mi:ss.ffTZHTZM'`);        

        await db.executeMany(
            `insert into JIRA_ISSUE_CHANGES (ID, created) values(:1,:2)`,
            [["755131", "2019-10-30T17:45:08.769+0300"]],
            {
                autoCommit: true,
                bindDefs: [
                    { type: 2001, maxSize: 40 },
                    { type: 2001, maxSize: 40 },
                ]
            }
        );

        // const sql = ``;
        // const result = await db.execute(
        //     `SELECT 1453 a, :id b from dual`,
        //     [103] // bind value for :id
        // );

        console.log("ORACLEDB_TEST - FINISHED!");
    } catch (err) {
        console.error(err);
    } finally {
        if (db) {
            try {
                await db.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

run();
