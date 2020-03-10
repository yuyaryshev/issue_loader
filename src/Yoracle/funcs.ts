import { OracleConnection } from "../other/Env";
import { debugMsgFactory, yconsole } from "Ystd";

const debugSql = debugMsgFactory("sql");

export async function tableExists(db: OracleConnection, tableName: string) {
    try {
        const sql = `select count(1) c from ${tableName} where 1=0`;
        debugSql(`CODE00000131`, sql);
        await db.execute(sql);
        return true;
    } catch (e) {
        return false;
    }
}

export async function executeIfExists(db: OracleConnection, sql: string) {
    try {
        debugSql(`CODE00000132`, sql);
        await db.execute(sql);
    } catch (e) {
        if (
            !(
                ["ORA-00942", "ORA-14452"].includes(e.message.split(":")[0]) ||
                e.message.includes(`не существует`) ||
                e.message.includes(`not exist`)
            )
        ) {
            console.warn(`CODE00000133 dropIfExists sql error - exclude this`, e);
            debugger; // Нельзя просто игнорить эту ошибку, потому что я так выполняю RENAME. А в нем - надо знать почему не удалось переименовать таблицу.
        }
    }
}

export async function renameTable(db: OracleConnection, oldName: string, newName: string, skipIfOldNotExist: boolean) {
    if (!(await tableExists(db, oldName))) {
        if (skipIfOldNotExist) return;
        throw new Error(`CODE00000134 Table '${oldName}' does not exist - can't rename it!`);
    }

    const sql = `RENAME ${oldName} TO ${newName}`;
    debugSql(`CODE00000135`, sql);
    await db.execute(sql);

    if (await tableExists(db, oldName))
        throw new Error(
            `CODE00000136 Failed to rename '${oldName}' -> ${newName}.  '${oldName}'- still exists after RENAME`
        );
}

export const creatorFactory = (createType: string, sql: string) =>
    async function(db: OracleConnection) {
        try {
            await db.execute(sql);
            yconsole.log(`CODE00000137`, `Creating ${createType}\n`, sql, "OK");
        } catch (e) {
            yconsole.error(`CODE00000138`, `Creating ${createType}\n`, sql, "WARN", e);
        }
    };

export const dropperFactory = (createType: string, sql: string) =>
    async function(db: OracleConnection) {
        try {
            await db.execute(sql);
            yconsole.log(`CODE00000139`, `Dropping ${createType}\n`, sql, "OK");
        } catch (e) {
            yconsole.error(`CODE00000140`, `Dropping ${createType}\n`, sql, "WARN", e);
        }
    };
