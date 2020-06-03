import better_sqlite3 from "better-sqlite3";
import moment from "moment";
import { jiraClean, JiraRequest, JiraRequestHandler, JiraStubInterface } from "./JiraWrapper";
import { awaitDelay, EnvWithTimers, manageableTimer, writeFileSyncIfChanged, ymutex } from "Ystd";
import { stringify } from "javascript-stringify";
import { BatchWriter, batchWriter } from "Yjob/batchWriter";

export interface JiraStubOptions {
    env: EnvWithTimers;
    filename?: string;
    forwardMode?: boolean;
    handler?: JiraRequestHandler;
    responseDelay?: number;
    limit?: number;
    limitReleaseDelay?: number;
    console?: any;
    prefetch?: boolean;
    errorStateChanged: (error: Error | undefined) => void;
}

export const defaultJiraStubOptions = {
    console: console,
};

// Добавлена возможность кешировать ответы Jira.
// Пример настройки приведен в settings_example.json
//
// Для первоначальной загрузки данных нужно установить параметр forwardMode = true.
// JiraStub применим для unit-test - см инициализацию в Env.ts поиск по makeJiraStub

export const makeJiraStub = (opts0: JiraStubOptions): JiraStubInterface => {
    const opts = Object.assign({}, defaultJiraStubOptions, opts0);
    const {
        console,
        filename,
        forwardMode,
        handler,
        responseDelay,
        limit,
        limitReleaseDelay,
        env,
        errorStateChanged,
    } = opts;
    const dbMode = filename && filename.endsWith(".db");
    const m = new Map<string, any>();
    const jiraStubWriteRequestsToFileTimer = manageableTimer(
        opts.env,
        300,
        `CODE00000296`,
        "jiraStubWriteRequestsToFileTimer",
        () => {
            const s: string = "module.exports.requests = " + (stringify(requests, undefined, "    ") || "{}");
            writeFileSyncIfChanged(filename!, s);
        }
    );

    let my_ymutex = limit ? ymutex(limit, limitReleaseDelay || 0) : undefined;
    let requests: any = {};
    let db: better_sqlite3.Database | undefined;
    let selectStatement: better_sqlite3.Statement<[string]>;

    let dbWriter: BatchWriter;
    if (dbMode) {
        db = better_sqlite3(filename!);
        dbWriter = batchWriter({
            env,
            db,
            tableName: "requests_cache",
            columnsStr: "ts, type, key, response",
            placeholdersStr: "?,?,?,?",
            batchSize: 25,
            timeout: 5000,
            errorStateChanged,
        });

        try {
            db.exec(`create table if not exists requests_cache(ts, type, key, response)`);
            db.exec(`create unique index if not exists ix_requests_cache on requests_cache(key)`);
            selectStatement = db.prepare(`select * from requests_cache where key = ?`);
            if (opts.prefetch) {
                for (let row of db.prepare(`select * from requests_cache`).iterate())
                    m.set(row.key, jiraClean(JSON.parse(row.response)));
            }
        } catch (e) {
            console.fatal(`CODE00000108`, `FATAL ERROR makeJiraStub sqlite error`, e);
            process.exit(1);
        }
    } else {
        try {
            requests = filename ? require(filename).requests : {};
        } catch (e) {
            opts.console.warn(`CODE00000185`, `JiraStub requests not found!`);
        }
    }

    if (!requests) requests = {};

    async function commonHandler(key: string, jiraRequest: JiraRequest, directGet: JiraRequestHandler): Promise<any> {
        let r: any;

        if (jiraRequest.jiraApiPath === "search.search" && jiraRequest.opts.jql.includes("updated"))
            return {
                expand: "schema,names",
                startAt: 0,
                maxResults: 50,
                total: 0,
                issues: [],
            };

        if (handler) r = await handler(key, jiraRequest, pthis.directGet);
        return r;
    }

    const pthis = {
        get: async (key: string, jiraRequest: JiraRequest) => {
            if (my_ymutex) {
                my_ymutex.lock(async () => {
                    let r;
                    if (responseDelay) await awaitDelay(responseDelay);
                    r = await commonHandler(key, jiraRequest, pthis.directGet);
                    return r || pthis.directGet(key, jiraRequest);
                });
            } else {
                let r;
                if (responseDelay) await awaitDelay(responseDelay);
                r = await commonHandler(key, jiraRequest, pthis.directGet);
                return r || pthis.directGet(key, jiraRequest);
            }
        },
        directGet: async (key: string, jiraRequest: JiraRequest) => {
            let r;
            if (!r) {
                if (!dbMode) r = requests[key];
                else {
                    if (opts.prefetch) r = m.get(key);

                    if (!r)
                        try {
                            const row = selectStatement.get(key);
                            if (row) {
                                r = JSON.parse(row.response);
                                if (opts.prefetch) m.set(key, r);
                            }
                        } catch (e) {
                            console.fatal(`CODE00000109`, `FATAL ERROR makeJiraStub sqlite error`, e);
                            process.exit(1);
                        }
                }
            }

            if (!r && !forwardMode) {
                opts.console.error(
                    `CODE00000027`,
                    `ERROR makeJiraStub.forwardMode=false provided key=${key} is unknown for makeJiraStub`
                );
                throw new Error(
                    `CODE00000028 ERROR makeJiraStub.forwardMode=false provided key=${key} is unknown for makeJiraStub`
                );
            }

            return r;
        },
        save: (key: string, jiraRequest: JiraRequest, value: any) => {
            requests[key] = value;
            if (dbMode) {
                try {
                    dbWriter.add(key, [moment().format(), jiraRequest.jiraApiPath, key, JSON.stringify(value)]);
                } catch (e) {
                    console.fatal(`CODE00000313`, `FATAL ERROR makeJiraStub sqlite error`, e);
                    process.exit(1);
                }
            } else if (filename) {
                jiraStubWriteRequestsToFileTimer.setTimeout();
            }
        },
    };

    return pthis;
};
