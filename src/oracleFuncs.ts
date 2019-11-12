import { OracleConnection } from "./startEnv";
import { yconsole, debugMsgFactory } from "./consoleMsg";
const debugSql = debugMsgFactory("sql");


export async function tableExists(db: OracleConnection, tableName: string) {
    try {
        const sql = `select count(1) c from ${tableName} where 1=0`;
        debugSql(`T3004`, sql);
        await db.execute(sql);
        return true;
    } catch (e) {
        return false;
    }
}

export async function executeIfExists(db: OracleConnection, sql: string) {
    try {
        debugSql(`T3005`, sql);
        await db.execute(sql);
    } catch (e) {
        if (
            !(
                ["ORA-00942", "ORA-14452"].includes(e.message.split(':')[0]) ||
                e.message.includes(`не существует`) ||
                e.message.includes(`not exist`)
            )
        ) {
            console.warn(`T1002 dropIfExists sql error - exclude this`, e);
            debugger; // Нельзя просто игнорить эту ошибку, потому что я так выполняю RENAME. А в нем - надо знать почему не удалось переименовать таблицу.
        }
    }
}

export async function renameTable(db: OracleConnection, oldName: string, newName: string, skipIfOldNotExist: boolean) {
    if (!(await tableExists(db, oldName))) {
        if (skipIfOldNotExist) return;
        throw new Error(`T1006 Table '${oldName}' does not exist - can't rename it!`);
    }

    const sql = `RENAME ${oldName} TO ${newName}`;   
    debugSql(`T3002`, sql);
    await db.execute(sql);

    if (await tableExists(db, oldName))
        throw new Error(`T1007 Failed to rename '${oldName}' -> ${newName}.  '${oldName}'- still exists after RENAME`);
}

export const creatorFactory = (createType: string, sql: string) =>
    async function(db: OracleConnection) {
        try {
            await db.execute(sql);
            yconsole.log(`T0202`, `Creating ${createType}\n`, sql, "OK");
        } catch (e) {
            yconsole.error(`T0203`, `Creating ${createType}\n`, sql, "ERROR", e);
        }
    };
