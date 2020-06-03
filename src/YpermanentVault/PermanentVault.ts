import { Database, Statement } from "better-sqlite3";

export type PermanentVaultId = string;
export type PermanentVaultType = string;
export type PermanentVaultPriority = string | number | undefined;
export type PermanentVaultJson = string;

export interface PermanentVaultObject {
    id: string;
    type: string;
    priority?: string | number | undefined;
}

export function isPermanentVaultObject(v: any): v is PermanentVaultObject {
    return !!(v && v.id && v.type);
}

export type PermanentVaultObjectVerificator<T extends PermanentVaultObject> = (v: T) => void;

export class PermanentVault<T extends PermanentVaultObject> {
    replaceSql: Statement<[PermanentVaultId, PermanentVaultType, PermanentVaultPriority, PermanentVaultJson]>;
    replaceManySql: Statement<any[]>;
    deleteSql: Statement<[PermanentVaultId]>;
    deleteAllSql: Statement<[]>;
    deleteAllTypeSql: Statement<[PermanentVaultType]>;
    queryAllSql: Statement<[number]>;
    queryAllTypeSql: Statement<[PermanentVaultType, number]>;
    queryByIdSql: Statement<[string]>;
    deleteManySql: Statement<PermanentVaultId[]>;

    constructor(
        public readonly db: Database,
        public readonly tableName: string,
        public readonly bulkSize: number = 16,
        public readonly verificator: PermanentVaultObjectVerificator<T> | undefined = undefined,
        public readonly limit = 100
    ) {
        db.exec(`create table if not exists ${this.tableName}(id, type, priority, json, primary key(id))`);

        this.replaceSql = db.prepare(`replace into ${this.tableName}(id, type, priority, json) values (?,?,?,?)`);
        this.deleteSql = db.prepare(`delete from ${this.tableName} where id = ?`);

        if (this.bulkSize < 1 || this.bulkSize > 2000000000)
            throw new Error(`Invalid bulkSize, should be in interval 1..2000000000, use 1 to disable bulk operations`);
        const deleteManyParamItems = [];
        for (let i = 0; i < this.bulkSize; i++) deleteManyParamItems.push("?");
        this.deleteManySql = db.prepare(
            `delete from ${this.tableName} where id in (${deleteManyParamItems.join(",")})`
        );

        const replaceManyParamItems = [];
        for (let i = 0; i < this.bulkSize; i++) replaceManyParamItems.push("(?,?,?,?)");
        this.replaceManySql = db.prepare(
            `replace into ${this.tableName}(id, type, priority, json) values ${replaceManyParamItems.join(",")}`
        );

        this.deleteAllSql = db.prepare(`delete from ${this.tableName}`);
        this.deleteAllTypeSql = db.prepare(`delete from ${this.tableName} where type = ?`);
        this.queryAllSql = db.prepare(`select * from ${this.tableName} order by priority desc limit ? offset 0`);
        this.queryAllTypeSql = db.prepare(
            `select * from ${this.tableName} where type = ? order by priority desc limit ? offset 0`
        );
        this.queryByIdSql = db.prepare(`select * from ${this.tableName} where id = ?`);
    }

    set(object: T | T[]) {
        if (Array.isArray(object)) {
            if (this.verificator) for (let o of object) this.verificator(o);
            if (this.bulkSize > 1)
                while (object.length > this.bulkSize) {
                    const params = [];
                    for (let o of object.splice(0, this.bulkSize))
                        params.push(o.id, o.type || "", o.priority, JSON.stringify(o));
                    this.replaceManySql.run(...params);
                }
            for (let o of object) this.replaceSql.run(o.id, o.type || "", o.priority, JSON.stringify(o));
        } else {
            if (this.verificator) this.verificator(object);
            this.replaceSql.run(object.id, object.type || "", object.priority, JSON.stringify(object));
        }
    }

    remove(id: PermanentVaultId | T | PermanentVaultId[] | T[]) {
        if (isPermanentVaultObject(id)) {
            this.deleteSql.run(id.id);
        } else if (Array.isArray(id)) {
            if (id.length) {
                if (isPermanentVaultObject(id[0])) {
                    const ids: PermanentVaultId[] = [];
                    for (let item of id as T[]) ids.push(item.id);
                    if (this.bulkSize > 1) {
                        while (ids.length) this.deleteManySql.run(...ids.splice(0, this.bulkSize));
                    } else for (let id2 of ids) this.deleteSql.run(id2);
                } else {
                    if (this.bulkSize > 1) {
                        while (id.length)
                            this.deleteManySql.run(...(id as PermanentVaultId[]).splice(0, this.bulkSize));
                    } else for (let id2 of id as PermanentVaultId[]) this.deleteSql.run(id2);
                }
            }
        } else this.deleteSql.run(id);
    }

    clear(type?: PermanentVaultType | undefined) {
        if (type) this.deleteAllTypeSql.run(type);
        else this.deleteAllSql.run();
    }

    query(type: PermanentVaultType | undefined, limit0?: number | undefined): T[] {
        const limit = limit0 || this.limit;
        const r0 = type ? this.queryAllTypeSql.all(type, limit) : this.queryAllSql.all(limit);
        const r = r0.map(row => JSON.parse(row.json));
        if (this.verificator) r.map(this.verificator);
        return r;
    }

    get(id: string): T | undefined {
        const r0 = this.queryByIdSql.all(id);
        const r = r0.map(row => JSON.parse(row.json));
        if (this.verificator) r.map(this.verificator);
        return r[0];
    }
}
