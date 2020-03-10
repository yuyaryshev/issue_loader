import { Database, Statement } from "better-sqlite3";
import { makePromise, makePromiseVoid, reversePromise, sha256hex } from "Ystd";

export interface BatchWriter<T extends unknown[] = unknown[]> {
    batchSize: number;
    buffer: Map<string, T>;
    singleRowStatement: Statement<any>;
    batchStatement: Statement<any>;
    add: (pk: string, row: T) => Promise<void>;
    flush: () => void;
    promise: Promise<void>;
    resolve: () => void;
}

export const batchWriterParamDefaults = {
    operator: "replace into ",
    batchSize: 200,
    timeout: 10,
};

export interface BatchWriterParams {
    db: Database;
    tableName: string;
    columnsStr: string;
    placeholdersStr: string;

    batchSize?: number;
    operator?: string;
    timeout?: number;
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
    let { db, tableName, columnsStr, placeholdersStr, batchSize, operator, timeout } = Object.assign(
        {},
        batchWriterParamDefaults,
        params
    );
    if (batchSize < 1) batchSize = 1;

    const singleRowStatement: Statement<any[]> = db.prepare(
        `${operator} ${tableName}(${columnsStr}) values (${placeholdersStr})`
    );
    const replaceManyParamItems = [];
    for (let i = 0; i < batchSize; i++) replaceManyParamItems.push(`(${placeholdersStr})`);
    const batchStatement: Statement<any[]> = db.prepare(
        `${operator} ${tableName}(${columnsStr}) values ${replaceManyParamItems.join(",")}`
    );

    const { promise, resolve } = makePromiseVoid();
    const pthis: BatchWriter<T> = {
        batchSize,
        buffer: new Map(),
        promise,
        resolve,
        add: function(pk: string, row: T): Promise<void> {
            if (!pthis.buffer.size) setTimeout(pthis.flush, timeout);

            pthis.buffer.set(pk, row);
            if (pthis.buffer.size > pthis.batchSize) pthis.flush();
            return pthis.promise;
        },
        singleRowStatement,
        batchStatement,
        flush: function flush() {
            if (!pthis.buffer.size) return;
            const arrayBuffer = [...pthis.buffer.values()];
            pthis.buffer.clear();

            if (pthis.batchSize > 1)
                while (arrayBuffer.length > pthis.batchSize) {
                    let batch = arrayBuffer.splice(0, pthis.batchSize);
                    let a: any[] = [];
                    for (let i = 0; i < pthis.batchSize; i++) a.push(...batch[i]);
                    batchStatement.run(...a);
                }

            const sz = arrayBuffer.length;
            let a: any[] = [];
            for (let i = 0; i < sz; i++) singleRowStatement.run(...arrayBuffer[i]);
            arrayBuffer.length = 0;

            pthis.resolve();
            const { promise, resolve } = makePromiseVoid();
            pthis.promise = promise;
            pthis.resolve = resolve;
        },
    };

    return pthis;
}
