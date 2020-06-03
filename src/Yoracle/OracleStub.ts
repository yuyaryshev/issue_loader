import better_sqlite3 from "better-sqlite3";
import { OracleConnection0 } from "./OracleConnection0";
import { BindParameters, ExecuteManyOptions, Promise, Result, Results } from "oracledb";
import { dbgStringify, isNumber, strReplace } from "Ystd";

export interface OracleStubOpts {
    betterSqlite: better_sqlite3.Database;
    tableName?: string;
}

export const defaultOracleStubOpts = {
    tableName: "ora",
};

export interface TableMeta {
    table: string;
    columns: string[];
}

export function extractMetaFromSql(sql: string) {
    sql = strReplace(strReplace(strReplace(sql, "\t", " "), "\r", " "), "\n", " ")
        .toUpperCase()
        .trim();
    let table: string = "";
    let columnsStr: string = "";
    if (sql.startsWith("SELECT ")) {
        columnsStr = sql.substr(6);
        columnsStr = columnsStr.substr(0, columnsStr.indexOf(" FROM "));
        table = sql.substr(sql.indexOf(" FROM ") + 6).trim();
        table = table.substr(0, table.indexOf(" ")).trim();
    } else if (sql.startsWith("INSERT INTO ")) {
        table = columnsStr = sql.substr(11).trim();
        table = table.substr(0, table.indexOf("(")).trim();

        columnsStr = sql.substr(11);
        columnsStr = columnsStr.substr(columnsStr.indexOf("(") + 1);
        columnsStr = columnsStr.substr(0, columnsStr.indexOf(")"));
    } else if (sql.startsWith("MERGE ")) {
        console.warn(`CODE00000193 extractMetaFromSql isn't implemented for merge`);
    } else console.warn(`CODE00000194 extractMetaFromSql failed because sql is unknown`);

    const columns = columnsStr
        .split(",")
        .map(c => c.trim())
        .filter(c => c.length > 0);

    if (table.length < 3) {
        console.warn(`CODE00000195 extractMetaFromSql failed to parse table name.`);
        return undefined;
    }

    if (columns.length < 1) {
        console.warn(`CODE00000196 extractMetaFromSql failed to parse columns.`);
        return undefined;
    }

    return { table, columns };
}

export function makeOracleStub(opts: OracleStubOpts): OracleConnection0 {
    const { betterSqlite: db } = { ...defaultOracleStubOpts, ...opts };
    const tables: { [key: string]: TableMeta } = {};

    function adjustTableForSql(sql: string) {
        const newMeta = extractMetaFromSql(sql);
        if (!newMeta) return;
        const meta = tables[newMeta.table];
        if (!meta) {
            tables[newMeta.table] = newMeta;
            db.exec(`create table ${newMeta.table}(${newMeta.columns.join(",")})`);
            return;
        }

        for (let column of newMeta.columns) {
            if (!meta.columns.includes(column)) db.exec(`alter table ${newMeta.table} add column ${column}`);
        }
    }

    const sqliteExec = (sql: string, bindParams: BindParameters) => {
        sql = sql
            .split(/([:][0-9]+)/g)
            .map(s => (s.length > 1 && isNumber(s.substr(1)) ? "?" : s))
            .join("");

        try {
            if (bindParams && bindParams.length) db.prepare(sql).run(...(bindParams as any));
            else db.exec(sql);
        } catch (e) {
            console.error(`CODE00000095 Sqlite error\n${sql}\n${dbgStringify(bindParams)}\n`, e);
        }
    };

    return {
        executeMany: async function executeMany<T>(
            sql: string,
            binds: BindParameters[],
            options: ExecuteManyOptions
        ): Promise<Results<T>> {
            if (sql.toUpperCase().startsWith("MERGE")) return undefined as any;

            adjustTableForSql(sql);
            for (let bindParams of binds) sqliteExec(sql, bindParams);
            return undefined as any;
        } as any,

        execute: async function execute<T>(sql: string, bindParams: BindParameters): Promise<Result<T>> {
            const s2 = sql.toUpperCase();
            if (s2.startsWith("MERGE") || s2.startsWith("DELETE")) return undefined as any;

            adjustTableForSql(sql);
            sqliteExec(sql, bindParams);
            return undefined as any;
        } as any,

        close: async () => {},
        commit: async () => {},
    };
}
