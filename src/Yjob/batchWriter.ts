import { Database, Statement } from "better-sqlite3";
import { awaitDelay, EnvWithTimers, makePromiseVoid, manageableTimer } from "Ystd";

export interface BatchWriter<T extends unknown[] = unknown[]> {
    batchSize: number;
    buffer: Map<string, (() => T) | T>;
    singleRowStatement: Statement<any>;
    batchStatement: Statement<any>;
    add: (pk: string, row: T) => Promise<void>;
    flush: () => void;
    promise: Promise<void>;
    resolve: () => void;
    lastError: Error | undefined;
    noBatchMode?: boolean;

    batchFlushes: number;
    nonBatchFlushes: number;
    batchRows: number;
    nonBatchRows: number;
}

export const batchWriterParamDefaults = {
    operator: "replace into ",
    batchSize: 200,
    timeout: 10,
};

export interface BatchWriterParams {
    env: EnvWithTimers;
    db: Database;
    tableName: string;
    columnsStr: string;
    placeholdersStr: string;

    batchSize?: number;
    operator?: string;
    timeout?: number;
    errorStateChanged?: (error: Error | undefined) => void | Promise<void>;
    noBatchMode?: boolean;
}

export interface BatchWriterParamsNonOptional {
    db: Database;
    tableName: string;
    columnsStr: string;
    placeholdersStr: string;

    batchSize?: number;
    operator?: string;
}

export function batchWriter<T extends unknown[]>(params: BatchWriterParams): BatchWriter<T> {
    let {
        env,
        db,
        tableName,
        columnsStr,
        placeholdersStr,
        batchSize,
        operator,
        timeout,
        errorStateChanged,
        noBatchMode,
    } = Object.assign({}, batchWriterParamDefaults, params);
    if (batchSize < 1) batchSize = 1;

    const singleRowStatement: Statement<any[]> = db.prepare(
        `${operator} ${tableName}(${columnsStr}) values (${placeholdersStr})`
    );
    const replaceManyParamItems = [];
    for (let i = 0; i < batchSize; i++) replaceManyParamItems.push(`(${placeholdersStr})`);
    const batchStatement: Statement<any[]> = db.prepare(
        `${operator} ${tableName}(${columnsStr}) values ${replaceManyParamItems.join(",")}`
    );

    function add(pk: string, row: (() => T) | T): Promise<void> {
        const oldPromise = pthis.promise;
        if (!pthis.noBatchMode) flushTimer.setTimeout();

        pthis.buffer.set(pk, row);
        if (pthis.noBatchMode) pthis.flush();
        else if (pthis.buffer.size > pthis.batchSize * 10) flushTimer.executeNow();
        return oldPromise;
    }

    const flush = async function flush() {
        // TODO Проблема опять тут! buffer.size опять очень часто равен 1! Видимо проблема в таймерах который сотнями стартуют
        if (!pthis.buffer.size) return;
        const arrayBuffer = [...pthis.buffer.values()];
        pthis.buffer.clear();

        const isBatched = arrayBuffer.length > pthis.batchSize / 3 + 1;

        if (isBatched) {
            pthis.batchFlushes++;
            pthis.batchRows += arrayBuffer.length;
        } else {
            pthis.nonBatchFlushes++;
            pthis.nonBatchRows += arrayBuffer.length;
        }

        let batches: any[] = [];
        let singles: any[] = [];
        if (pthis.batchSize > 1)
            while (arrayBuffer.length > pthis.batchSize) {
                let batch = arrayBuffer.splice(0, pthis.batchSize);
                let a: any[] = [];
                for (let i = 0; i < pthis.batchSize; i++)
                    a.push(...(typeof batch[i] === "function" ? (batch as any)[i]() : batch[i]));
                batches.push(a);
            }

        const sz = arrayBuffer.length;
        let a: any[] = [];
        for (let i = 0; i < sz; i++)
            singles.push(typeof arrayBuffer[i] === "function" ? (arrayBuffer as any)[i]() : arrayBuffer[i]);

        try {
            db.exec("begin transaction");
            //                db.transaction(() => {
            for (let i = 0; i < batches.length; i++) batchStatement.run(batches[i]);
            for (let i = 0; i < singles.length; i++) singleRowStatement.run(singles[i]);
            db.exec("commit");
            //                });
            if (pthis.lastError) {
                pthis.lastError = undefined;
                if (errorStateChanged) await errorStateChanged(pthis.lastError);
            }
        } catch (e) {
            while (true) {
                try {
                    db.exec("rollback");
                } catch (e) {}
                try {
                    while (batches.length > 0) {
                        batchStatement.run(batches[0]);
                        batches.splice(0, 1);
                    }

                    while (singles.length > 0) {
                        singleRowStatement.run(singles[0]);
                        singles.splice(0, 1);
                    }

                    if (pthis.lastError) {
                        pthis.lastError = undefined;
                        if (errorStateChanged) await errorStateChanged(pthis.lastError);
                    }
                    break;
                } catch (e) {
                    if (!pthis.lastError) {
                        pthis.lastError = e;
                        if (errorStateChanged) {
                            await errorStateChanged(pthis.lastError);
                            await awaitDelay(1000);
                        } else throw e;
                    }
                }
            }
        }

        pthis.resolve();
        const { promise, resolve } = makePromiseVoid();
        pthis.promise = promise;
        pthis.resolve = resolve;
    };

    const flushTimer = manageableTimer(env, timeout, `CODE00000210`, `batchWriterFlushTimer`, flush);

    const { promise, resolve } = makePromiseVoid();
    const pthis: BatchWriter<T> = {
        lastError: undefined,
        batchSize,
        noBatchMode,
        buffer: new Map(),
        promise,
        resolve,
        add,
        singleRowStatement,
        batchStatement,
        flush,

        batchFlushes: 0,
        nonBatchFlushes: 0,
        batchRows: 0,
        nonBatchRows: 0,
    };

    return pthis;
}
