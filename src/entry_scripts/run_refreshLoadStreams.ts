import { Env, EnvSettings } from "../other/Env";
import { decoderLoadStream, LoadStreams } from "dbDomains";
import { debugMsgFactory } from "Ystd";
import { singletonJob, StatusReporter } from "Yjob";
import { OracleConnection0 } from "Yoracle";

const debug = debugMsgFactory("run");
const debugSql = debugMsgFactory("sql");
const debugStreams = debugMsgFactory("run.streams");
const debugIssues = debugMsgFactory("run.issues");
const debugWorkCycle = debugMsgFactory("run.workCycle");

export interface LoadStreamStatus {
    id: string;
    updated_ts: string;
}

export class LoadStreamsList {
    readonly sqlLoadStreams: string;
    loadStreams: LoadStreams;

    constructor(settings: EnvSettings) {
        this.sqlLoadStreams = `select * from ${settings.tables.LOAD_STREAM_T}`;
        this.loadStreams = {};
    }

    async refresh(env: Env) {
        const pthis = this;

        await singletonJob<Env>(env, "CODE00000161", "db.LoadStreams.refresh", async function LoadStreams_refresh(
            job: StatusReporter
        ) {
            job.setStep("CODE00000157", "Connecting to Db", "DbConn");
            await env.dbProvider(async function(db: OracleConnection0) {
                debugSql(`CODE00000158`, `Reading load streams from Oracle '${pthis.sqlLoadStreams}'`);
                const response = await db.execute(pthis.sqlLoadStreams);
                job.setStep("CODE00000159", "Reading rows", undefined);
                if (!response.rows)
                    throw new Error(
                        `CODE00000160 ${pthis.sqlLoadStreams} returned incorrect result:'${JSON.stringify(response)}'`
                    );

                debugStreams(`CODE00000162`, `parsing results`);
                const newLoadStreams = {} as LoadStreams;

                for (let r of response.rows as any) {
                    for (let k in r) if (r[k] === null) r[k] = undefined;
                    r.ENABLED = r.ENABLED === "Y";
                    r.idle = true;
                    decoderLoadStream.runWithException(r);
                    newLoadStreams[r.ID] = r;
                }

                const newStatuses: LoadStreamStatus[] = [];
                for (let lsId in newLoadStreams) {
                    const ls = newLoadStreams[lsId];
                    env.status.loadStreams.push({
                        id: ls.ID,
                        updated_ts: ls.LAST_UPDATED_TS || "",
                    });
                }

                env.status.loadStreams = newStatuses;
                pthis.loadStreams = newLoadStreams;

                debugStreams(`CODE00000163`, `Finished - OK`);

                job.setStep("CODE00000164", "Finished", undefined);
                if (env.terminating) return;
            });
        });
    }
}
