import { awaitDelay, EnvWithTimers, makePromiseVoid, manageableTimer } from "Ystd";
import { EnvWithDbdJiraIssue } from "./Env";
import { PreperedDbDomain } from "dbDomains";
import { OracleConnection0 } from "Yoracle";

export interface OracleBatchWriter {
    batchSize: number;
    buffer: {
        [key: string]: {
            dbd: PreperedDbDomain<any, any>;
            rows: Map<string, any>;
        };
    };
    add: <T>(dbd: PreperedDbDomain<T, any>, row: T | T[]) => Promise<void>;
    flush: () => void;
    promise: Promise<void>;
    resolve: () => void;
    reject: (e: Error) => void;
    lastError: Error | undefined;
    noBatchMode?: boolean;

    batchFlushes: number;
    nonBatchFlushes: number;
    batchRows: number;
    nonBatchRows: number;
}

export const oracleBatchWriterParamDefaults = {
    batchSize: 500,
    timeout: 5000,
};

export interface OracleBatchWriterParams {
    env: EnvWithDbdJiraIssue;
    batchSize?: number;
    timeout?: number;
    errorStateChanged?: (error: Error | undefined) => void | Promise<void>;
    noBatchMode?: boolean;
}

export function makeOracleBatchWriter(params: OracleBatchWriterParams): OracleBatchWriter {
    let { env, batchSize, timeout, errorStateChanged, noBatchMode } = Object.assign(
        {},
        oracleBatchWriterParamDefaults,
        params
    );
    if (batchSize < 1) batchSize = 1;

    function add<T>(dbd: PreperedDbDomain<T, any>, rowOrRows: T | T[]): Promise<void> {
        const oldPromise = pthis.promise;
        if (!Array.isArray(rowOrRows)) rowOrRows = [rowOrRows];
        for (let row of rowOrRows) {
            const pk = dbd.extractKey!(row);
            if (!pthis.noBatchMode) flushTimer.setTimeout();

            if (!pthis.buffer[dbd.name]) pthis.buffer[dbd.name] = { dbd, rows: new Map<string, any>() };
            pthis.buffer[dbd.name].rows.set(pk, row);

            if (pthis.noBatchMode) pthis.flush();
        }
        return oldPromise;
    }

    const flush = async function flush() {
        await env.dbProvider(async function(db: OracleConnection0) {
            try {
                if (!Object.keys(pthis.buffer).length) return;
                const v_buffer = pthis.buffer;
                pthis.buffer = {};

                for (let dbdName in v_buffer) {
                    const { dbd, rows } = v_buffer[dbdName];
                    await dbd.insertMany(db, [...rows.values()]);
                    await db.commit();

                    if (!env.settings.write_into_log_tables) {
                        await dbd.executeMerge!(db);
                        await db.commit();
                    }
                }

                pthis.resolve();
            } catch (e) {
                pthis.reject(e);
            }

            const { promise, resolve, reject } = makePromiseVoid();
            pthis.promise = promise;
            pthis.resolve = resolve;
            pthis.reject = reject;
        });
    };

    const flushTimer = manageableTimer(env, timeout, `CODE00000324`, `batchWriterFlushTimer`, flush);

    const { promise, resolve, reject } = makePromiseVoid();
    const pthis: OracleBatchWriter = {
        lastError: undefined,
        batchSize,
        noBatchMode,
        buffer: {},
        promise,
        resolve,
        reject,
        add,
        flush,

        batchFlushes: 0,
        nonBatchFlushes: 0,
        batchRows: 0,
        nonBatchRows: 0,
    };

    return pthis;
}
