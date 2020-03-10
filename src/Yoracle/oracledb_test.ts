// myscript.js
// This example uses Node 8's async/await syntax.

import oracledb from "oracledb";
import { startEnv } from "../other/Env";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function run() {
    let db;
    try {
        const env = await startEnv("test", { noJiraTest: true, noDbTest: true });
        //T17:45:08.769+0300
        //"T"hh24:mi:ss.ffTZHTZM
        db = await oracledb.getConnection(env.settings.oracle);

        await db.execute(`alter session set NLS_TIME_FORMAT='HH24:MI:SSXFF'`);
        await db.execute(`alter session set NLS_TIMESTAMP_FORMAT='YYYY-MM-DD"T"hh24:mi:ss.ff'`);
        await db.execute(`alter session set NLS_TIME_TZ_FORMAT='HH24:MI:SSXFF TZR'`);
        await db.execute(`alter session set NLS_TIMESTAMP_TZ_FORMAT='YYYY-MM-DD"T"hh24:mi:ss.ffTZHTZM'`);
        if (env.settings.oracle.schema)
            await db.execute(`ALTER SESSION SET CURRENT_SCHEMA=${env.settings.oracle.schema}`);

        const result = await db.execute(`insert into bireport_stg.tst_clob(id,c) values (?, ?)`, [
            1,
            "aaaaaaaa тест тест тест",
        ]);
        await db.commit();

        console.log("ORACLEDB_TEST 2 - FINISHED!");
    } catch (err) {
        console.error("ORACLEDB_TEST ERROR:", err);
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

async function run_old() {
    const env = await startEnv("test", { noJiraTest: true, noDbTest: false });

    let db;
    try {
        //T17:45:08.769+0300
        //"T"hh24:mi:ss.ffTZHTZM
        db = await oracledb.getConnection(env.settings.oracle);

        await db.execute(`alter session set NLS_TIME_FORMAT='HH24:MI:SSXFF'`);
        await db.execute(`alter session set NLS_TIMESTAMP_FORMAT='YYYY-MM-DD"T"hh24:mi:ss.ff'`);
        await db.execute(`alter session set NLS_TIME_TZ_FORMAT='HH24:MI:SSXFF TZR'`);
        await db.execute(`alter session set NLS_TIMESTAMP_TZ_FORMAT='YYYY-MM-DD"T"hh24:mi:ss.ffTZHTZM'`);
        if (env.settings.oracle.schema)
            await db.execute(`ALTER SESSION SET CURRENT_SCHEMA=${env.settings.oracle.schema}`);

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
