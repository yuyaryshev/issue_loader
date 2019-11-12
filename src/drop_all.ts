import { startEnv, OracleConnection, Env } from "./startEnv";
import { executeIfExists } from "./oracleFuncs";
import { yconsole } from "./consoleMsg";

export  async function dropAllTables(env:Env, db: OracleConnection, skipLoadStream: boolean)  {
    for(let ti in env.settings.tables) {
        if(skipLoadStream && ["LOAD_STREAM"].includes(ti))
            continue;

        const t = (env.settings.tables as any)[ti]  as string;
        const sql = `drop table ${t}`;
        await executeIfExists(db, sql);
        yconsole.log(`T0802`, sql);
    }

    for(let t of Object.values(env.settings.stored_procedures)){
        const sql = `drop procedure ${t}`;
        await executeIfExists(db, sql);
        yconsole.log(`T0802`, sql);
    }    
}


export const drop_all = async function() {
    const env = await startEnv("drop_all", {noJiraTest:true});
    yconsole.log(`T0801`, `Starting 'drop_all'...`);

    await env.dbProvider(async function(db: OracleConnection) {
        await dropAllTables(env, db, !!env.settings.yyadev);
    });

    yconsole.log(`T0803`, `Finished 'drop_all'.`);
};
