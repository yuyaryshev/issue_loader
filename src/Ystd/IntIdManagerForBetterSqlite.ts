import { IntIdManager, IntInterval } from "./IntIdManager";
import { Database, Statement } from "better-sqlite3";

// Как пересобирать интервалы
//  1. Установить интервалы в изначальный пустой интервал manager.intervals = [{a:1, b:100000000}]
//  2. Считать все существующие id из таблицы и использовать removeId(id)

export class IntIdManagerForSqlite extends IntIdManager {
    preparedSelect: Statement<[]>;
    preparedDelete: Statement<[number]>;
    preparedInsert: Statement<[number, number]>;
    private _oldIntervals: IntInterval[];

    constructor(
        public readonly db: Database,
        public readonly tableName: string,
        public readonly defaultInterval: IntInterval = { a: 1, b: 100000000 },
        public readonly selectAllIdsSql: string | undefined = undefined,
        public readonly maxIntervalsInCache: number = 10
    ) {
        super(defaultInterval);
        this._oldIntervals = [];
        try {
            db.exec(`create table ${this.tableName}(a,b)`);
            db.exec(`create unique index ix_${this.tableName} on ${this.tableName}(a)`);
        } catch (e) {}
        this.preparedSelect = db.prepare(`select a, b from ${this.tableName}`);
        this.preparedDelete = db.prepare(`delete from ${this.tableName} where a = ?`);
        this.preparedInsert = db.prepare(`insert into ${this.tableName}(a,b) values(?,?)`);
        this.load();
        if (!this._intervals) {
            if (this.selectAllIdsSql) this.reconstructIntervals();
            else this._intervals = [defaultInterval];
        }
    }

    reconstructIntervals(selectAllIdsSql?: string | undefined, defaultInterval?: IntInterval | undefined) {
        const selectAllIdsSql2 = selectAllIdsSql || this.selectAllIdsSql;
        const defaultInterval2 = defaultInterval || this.defaultInterval;
        if (!selectAllIdsSql2)
            throw new Error(
                `ERROR IntIdManagerForSqlite.reconstructIntervals - selectAllIdsSql can't be empty in both constructor and parameter`
            );

        if (!defaultInterval2)
            throw new Error(
                `ERROR IntIdManagerForSqlite.reconstructIntervals - selectAllIdsSql can't be empty in both constructor and parameter`
            );

        this.clear();
        this.intervals.push(defaultInterval2);
        for (const id of this.db.prepare(selectAllIdsSql2).iterate()) this.removeId(id);
    }

    load() {
        this.save();
        let newIntervals: IntInterval[] = [];
        this._oldIntervals = [];
        for (let { a, b } of this.preparedSelect.iterate()) {
            newIntervals.push({ a, b });
            this._oldIntervals.push({ a, b });
            if (newIntervals.length > this.maxIntervalsInCache) break;
        }
        this.changed = false;
    }

    save() {
        if (this.changed) {
            const m: { [key: number]: { o?: number; n?: number } } = {};
            for (const interval of this._oldIntervals) {
                if (!m[interval.a]) m[interval.a] = {};
                m[interval.a].o = interval.b;
            }

            for (const interval of this._intervals) {
                if (!m[interval.a]) m[interval.a] = {};
                m[interval.a].n = interval.b;
            }

            for (const a in m) {
                const { o, n } = m[a];
                if (o !== n) {
                    if (o !== undefined) this.preparedDelete.run(Number(a));
                    if (n !== undefined) this.preparedInsert.run(Number(a), n);
                }
            }
            this.changed = false;
        }
    }
}
