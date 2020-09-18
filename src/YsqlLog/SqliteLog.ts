import moment, { Duration } from "moment";
import { Database, Statement } from "better-sqlite3";
import { makeMomentInterval } from "../Ystd/makeMomentInterval";
import { awaitDelay, dbgStringify } from "Ystd";

export interface LogSettings {
    groupby?: string;
    table: string;
    durationLimit?: Duration;
    itemsToKeepInRAM?: number;
    countLimit?: number;
    maxId: number; // Maximum Id that DB can store. Don't use this to limit logs! Use 'countLimit' instead!
    recreateWhenPrepareFails: boolean;
}

export const defaultLogSettings: LogSettings = {
    table: "log",
    durationLimit: makeMomentInterval("30d"),
    itemsToKeepInRAM: 100,
    countLimit: 100000,
    maxId: 2000000000,
    recreateWhenPrepareFails: true,
};

export interface LogStats {
    count: number;
    minId: number;
    maxId: number;
    mminId: number; // Middle-point min
    mmaxId: number; // Middle-point max
    maxTs: string | undefined;
    dualMode: 1 | 0;
    middlePoint: number;
    lastId: number;
}

export interface SqliteLogItem {
    ts?: string;
    cpl: string;
    message?: string;
    severity: string;
}

(global as any).totalLogBusy = 0;

export class SqliteLog<T extends SqliteLogItem> {
    public readonly settings: LogSettings;
    public readonly lastItems: T[];

    tableName: string;
    statsSql: Statement<[]>;
    stats: LogStats;
    lastId: number;
    getStats: () => LogStats;

    add: (data: T) => void;
    deleteOld: () => void;
    deleteAll: () => void;
    additionalDeleteOldCond: string;

    constructor(
        public readonly db: Database,
        public columnsStr: string,
        settings0: Partial<LogSettings> = defaultLogSettings
    ) {
        const pthis = this;
        const settings = (this.settings = Object.assign({}, defaultLogSettings, settings0));

        const middlePoint = settings.maxId / 2;
        this.tableName = settings.table;
        this.lastItems = [];
        this.additionalDeleteOldCond = "1=0";

        const columns = columnsStr.split(",").filter((f) => !["id", "ts", "cpl", "message", "severity"].includes(f));
        const dropSql = `drop table if exists ${this.tableName}`;
        const createSql = `create table if not exists ${
            this.tableName
        }(id integer primary key, ts, cpl, message, severity, ${columns.join(",")})`;
        db.exec(createSql);

        this.statsSql = db.prepare(
            `select count(1) c, min(id) min_id, max(case when id < ${middlePoint} then id else 0 end) mmax_id, min(case when id >= ${middlePoint} then id else 0 end) mmin_id, max(id) max_id, max(ts) max_ts from ${this.tableName}`
        );
        this.getStats = () => {
            let { c, min_id, mmin_id, mmax_id, max_id, max_ts } = this.statsSql.all()[0];
            const dualMode = max_id - min_id > middlePoint * 1.1 ? 1 : 0;
            const lastId = (dualMode ? mmax_id : max_id) || 0;

            pthis.stats = {
                count: Number(c || 0),
                minId: Number(min_id || 0),
                mminId: Number(mmin_id || 0),
                mmaxId: Number(mmax_id || 0),
                maxId: Number(max_id || 0),
                maxTs: max_ts || "1900-01-01",
                middlePoint,
                dualMode,
                lastId,
            };
            pthis.lastId = pthis.stats.lastId;
            return pthis.stats;
        };
        this.stats = this.getStats();
        this.lastId = this.stats.lastId;

        const insertSql = `insert into ${this.tableName}(id, ts, cpl, message, severity, ${columns.join(",")}) 
        values (:id, :ts, :cpl, :message, :severity, ${columns.map((c) => ":" + c).join(",")})`;

        let insertStmt: Statement<any[]>;
        try {
            insertStmt = db.prepare(insertSql);
        } catch (e) {
            if (!settings.recreateWhenPrepareFails) throw e;

            console.trace(`CODE00000299 recreating log db table because of error '${e.message}', sql = ${insertSql}`);
            db.exec(dropSql);
            db.exec(createSql);
            insertStmt = db.prepare(insertSql);
        }

        this.add = function (data: any) {
            data.id = ++pthis.lastId;
            if (!data.ts) data.ts = moment().format();
            if ((pthis.settings.itemsToKeepInRAM || 0) > 0) {
                pthis.lastItems.push(data);
                if (pthis.lastItems.length > pthis.settings.itemsToKeepInRAM!)
                    pthis.lastItems.splice(0, pthis.lastItems.length - pthis.settings.itemsToKeepInRAM!);
            }
            setTimeout(function writeLogTimeout() {
                try {
                    insertStmt.run(data);
                } catch (e) {
                    if (e.message.includes("connection is busy")) {
                        (async function delayedSqliteLogWrite() {
                            for (
                                let i = 0;
                                i < 5 * 60 * 10;
                                i++ // try no more than 5 minutes
                            )
                                try {
                                    insertStmt.run(data);
                                    return;
                                } catch (e) {
                                    if (e.message.includes("connection is busy")) {
                                        (global as any).totalLogBusy++;
                                        await awaitDelay(100);
                                        continue;
                                    }
                                    console.trace(
                                        `CODE00000265 SqliteLog error '${e?.message}', sql = ${insertStmt.source},\ndata = `,
                                        dbgStringify(data),
                                        pthis
                                    );
                                }
                            console.trace(
                                `CODE00000266 SqliteLog error '${e?.message}', sql = ${insertStmt.source},\ndata = `,
                                dbgStringify(data),
                                pthis
                            );
                        })();
                    } else console.trace(`CODE00000267 SqliteLog error '${e?.message}', sql = ${insertStmt.source},\ndata = `, dbgStringify(data));
                }
            }, 0);
        };

        const conds: string[] = [this.additionalDeleteOldCond];
        if (settings.durationLimit) conds.push("ts < :limitingTs");

        if (settings.countLimit) conds.push("id < :limitingId or (:dualMode <> 0 and id >= :middlePoint)");

        const deleteSql = `delete from ${this.tableName} where ${conds.join(" or ")}`;

        const deleteOldStmt = db.prepare(deleteSql);

        this.deleteOld = function () {
            if (settings.countLimit) {
                const dualMode = pthis.stats.maxId - pthis.stats.minId > middlePoint * 1.1 ? 1 : 0;
                const params = {
                    dualMode,
                    middlePoint,
                    limitingId: settings.countLimit
                        ? dualMode
                            ? pthis.stats.mmaxId - settings.countLimit
                            : pthis.stats.maxId - settings.countLimit
                        : undefined,
                    limitingTs: settings.durationLimit ? moment().subtract(settings.durationLimit).format() : undefined,
                    lastId: pthis.stats.lastId,
                    currentTs: moment().format(),
                };
                deleteOldStmt.run(params);
                console.log(`CODE00000295 Deleting old logs:\n${deleteSql}\n${JSON.stringify(params)}`);
            }
        };

        const deleteAllStmt = db.prepare(`delete from ${this.tableName}`);
        this.deleteAll = () => {
            deleteAllStmt.run();
        };
    }
}
