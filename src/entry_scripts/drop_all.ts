import { Env, startEnv } from "../other/Env";
import { executeIfExists, OracleConnection0 } from "Yoracle";
import { yconsole } from "Ystd";

export async function dropAllTables(env: Env, db: OracleConnection0, skipLoadStream: boolean) {
    for (let ti in env.settings.tables) {
        if (skipLoadStream && ["LOAD_STREAM_T"].includes(ti)) continue;

        const t = (env.settings.tables as any)[ti] as string;
        const sql = `drop table ${t}`;
        await executeIfExists(db, sql);
        yconsole.log(`CODE00000090`, sql);
    }

    for (let t of Object.values(env.settings.stored_procedures)) {
        const sql = `drop procedure ${t}`;
        await executeIfExists(db, sql);
        yconsole.log(`CODE00000091`, sql);
    }
}

export const drop_all = async function() {
    const env = await startEnv("drop_all", { noJiraTest: true });
    yconsole.log(`CODE00000092`, `Starting 'drop_all'...`);

    await env.dbProvider(async function(db: OracleConnection0) {
        await dropAllTables(env, db, !!env.settings.yyadev);
    });

    yconsole.log(`CODE00000093`, `Finished 'drop_all'.`);
};
