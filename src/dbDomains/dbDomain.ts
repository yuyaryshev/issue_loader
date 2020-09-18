import oracledb from "oracledb";
import { EnvSettings } from "../other/Env";
import { constant, Decoder, oneOf } from "@mojotech/json-type-validation";
import { debugMsgFactory, yconsole } from "Ystd";
import {
    creatorFactory,
    makeMergeSql,
    makeProcSql,
    MergeMeta,
    OracleConnection0,
    tableExists as dbTableExists,
} from "Yoracle";

const debugSql = debugMsgFactory("sql");
const debugSqlMerge = debugMsgFactory("sql.merge");

export const oracleTypes = {
    string40: { name: "varchar2(40)", bindType: { type: oracledb.STRING, maxSize: 40 } },
    string100: { name: "varchar2(100)", bindType: { type: oracledb.STRING, maxSize: 100 } },
    string255: { name: "varchar2(255)", bindType: { type: oracledb.STRING, maxSize: 255 } },
    string2000: { name: "varchar2(2000)", bindType: { type: oracledb.STRING, maxSize: 2000 } },
    string4000: { name: "varchar2(4000)", bindType: { type: oracledb.STRING, maxSize: 4000 } },
    dwh_flag: { name: "varchar2(1)", bindType: { type: oracledb.STRING, maxSize: 1 } },
    integer: { name: "number", bindType: { type: oracledb.NUMBER } },
    number: { name: "number", bindType: { type: oracledb.NUMBER } },
    //date: { name: "date", bindType: { type: oracledb.STRING, maxSize: 70 } },
    //datetime: { name: "timestamp(6) with time zone", bindType: { type: oracledb.STRING, maxSize: 70 } },
    json: { name: "clob", bindType: { type: oracledb.CLOB } },
};

export type DomainFieldType =
    | "string40"
    | "string100"
    | "string255"
    | "string2000"
    | "string4000"
    | "integer"
    | "number"
    //| "date"
    //| "datetime"
    | "dwh_flag"
    | "json";

export const decoderDomainFieldType: Decoder<DomainFieldType> = oneOf(
    constant("string40"),
    constant("string100"),
    constant("string255"),
    constant("string2000"),
    constant("string4000"),
    constant("integer"),
    constant("number"),
    //constant("date"),
    //constant("datetime"),
    constant("dwh_flag"),
    constant("json")
);

export interface DbDomFieldInput {
    name: string;
    type: DomainFieldType;
    nullable: boolean;
    pk: boolean;
    insert: boolean;
    defaultValue?: any;
    oracleType?: string;
}

export interface DbDomainInput<T, JiraT, FT extends DbDomFieldInput = DbDomFieldInput> {
    indexOrganized?: boolean;
    name: string;
    hasChangesTable: boolean;
    // table: string;
    // changesTable: string | undefined;
    // handlerStoredProc: string | undefined;
    fields: FT[];
    datetimeWalker?: any;
    deleteByIssueKeyBeforeMerge: boolean;
    fromJira?: (jiraValue: JiraT) => T;
}

export interface PreperedDbDomain<T, JiraT = unknown> {
    name: string;
    createTableSql: string;
    tableExists: (db: OracleConnection0) => Promise<boolean>;
    changesTableExists: (db: OracleConnection0) => Promise<boolean>;
    createTable: (db: OracleConnection0) => Promise<void>;
    dropObjects: (db: OracleConnection0, keepPermanent?: boolean) => Promise<void>;
    insertMany: (db: OracleConnection0, values: T[]) => Promise<void>;

    createChangesTableSql?: string;
    objectToArray?: (f: T) => any;
    deleteByIssueJeySql?: string;
    mergeSql?: string;

    createChangesTable?: (db: OracleConnection0) => Promise<void>;
    createHandleChangesSP?: (db: OracleConnection0) => Promise<void>;
    executeMerge?: (db: OracleConnection0) => Promise<void>;
    fromJira?: (jiraValue: JiraT) => T;

    extractKeyJs?: string;
    extractKey?: (o: T) => string;
}

export function utf8len(s: string) {
    var b = 0,
        i = 0,
        c;
    for (; (c = s.charCodeAt(i++)); b += c >> 11 ? 3 : c >> 7 ? 2 : 1);
    return b;
}

export function utf8trim(v: any, size: number): string {
    if (typeof v !== "string") return v;
    if (v.length < size / 3 - 1) return v;

    var b = 0,
        i = 0,
        c;
    while (true) {
        c = v.charCodeAt(i);
        //b+=c>>11?3:c>>7?2:1;
        b += 3;
        if (b > size) {
            return v.substr(0, i);
        }
        if (!c || b > size) return v;
        i++;
    }
}

export type InferDbDomain = ReturnType<typeof prepareDbDomain>;
export const prepareDbDomain = <FT extends DbDomFieldInput, DT extends DbDomainInput<any, any, FT>>(
    settings: EnvSettings,
    d: DT
): PreperedDbDomain<any, any> => {
    function replaceTableName(tableName: string): string {
        return (settings && settings.tables && (settings.tables as any)[tableName]) || tableName;
    }

    function replaceSPName(spName: string): string {
        return (settings && settings.stored_procedures && (settings.stored_procedures as any)[spName]) || spName;
    }

    const table = replaceTableName(d.name);
    const changesTable = replaceTableName(d.name + "_CHANGES");

    const targetTable = d.hasChangesTable ? changesTable : table;

    const handlerStoredProc = replaceSPName("HANDLE_" + d.name + "_CHANGES");

    const insertSql = `insert into ${targetTable} (
        ${d.fields
            .filter((f) => f.insert)
            .map((f) => f.name)
            .join(",\n")}
    ) values(${d.fields
        .filter((f) => f.insert)
        .map((f, i) => f.insert && ":" + (i + 1))
        .join(",")})`;

    const insertBindDefs = d.fields
        .filter((f) => f.insert)
        .map((f) => {
            if (!oracleTypes[f.type]) debugger;

            return Object.assign({}, oracleTypes[f.type].bindType);
        });

    const columnsInCreateTable = d.fields
        .map(
            (f) =>
                `    ${f.name} ${f.oracleType || oracleTypes[f.type].name} ${
                    f.defaultValue ? "default " + f.defaultValue : ""
                } ${f.nullable ? "" : "not null"}`
        )
        .join(",\n");

    const pkColumnsStr = d.fields
        .filter((f) => f.pk)
        .map((f) => f.name)
        .join(", ");

    const pkStr = pkColumnsStr.length ? `, PRIMARY KEY (${pkColumnsStr})` : "";

    const createTableSql = `create table ${table} (${columnsInCreateTable} ${pkStr}) ${
        d.indexOrganized ? "ORGANIZATION INDEX PCTTHRESHOLD 10" : ""
    }`;

    const dropObjects = async function (db: OracleConnection0, keepPermanent: boolean = false) {
        if (!keepPermanent)
            try {
                await db.execute(`drop table ${table}`);
            } catch (e) {}
        try {
            await db.execute(`drop table ${changesTable}`);
        } catch (e) {}
        try {
            await db.execute(`drop stored procedure ${handlerStoredProc}`);
        } catch (e) {}
    };

    const objectToArrayStr = `f => [${d.fields
        .filter((f) => f.insert)
        .map((f) => {
            const rr = "f." + f.name;
            if (f.name == "TS" && settings.write_into_log_tables) return `${rr}`;
            if (f.type.startsWith("string")) return `utf8trim(${rr}, ${f.type.split("string")[1]})`;
            return rr;
        })
        .join(",")}]`;
    const objectToArray = eval(objectToArrayStr) as any;

    const insertMany = async function (db: OracleConnection0, values: any[]) {
        debugSql(`CODE00000039`, insertSql);
        const mappedValues = values.map(objectToArray) as any[];
        const bindingDefs = {
            autoCommit: true,
            bindDefs: insertBindDefs,
        };

        try {
            await db.executeMany(insertSql, mappedValues, bindingDefs);
        } catch (e) {
            let errorRows = 0;
            let byRowHasError = false;
            for (let r of mappedValues) {
                const r0 = Object.assign([], r);
                const rStr = JSON.stringify([r], undefined, "    ");
                // if(r[3]==="6635699")
                try {
                    // if(r[3]==="6635699")
                    //     for(let i=10;i<10;i++)
                    //         r[i] = "";
                    await db.executeMany(insertSql, [r], bindingDefs);
                } catch (e2) {
                    byRowHasError = true;
                    yconsole.log(
                        `CODE00000040`,
                        `DB ERROR ${e2.message}`,
                        `objectToArrayStr = ${objectToArrayStr}\n\n`,
                        `Code for easy sql debugging:\nawait db.executeMany(\`${insertSql}\`,${rStr},${JSON.stringify(
                            bindingDefs,
                            undefined,
                            "    "
                        )});\n\n`,
                        r0
                    );
                }
                if (errorRows > 10) {
                    yconsole.log(`CODE00000041`, `DB ERROR - too many error rows!`);
                    break;
                }
            }
            if (!byRowHasError)
                yconsole.log(
                    `CODE00000042`,
                    `Error in bulk mode, but no error in row mode!`,
                    `objectToArrayStr = ${objectToArrayStr}\n\n`,
                    `Code for easy sql debugging:\nawait db.executeMany(\`${insertSql}\`,${JSON.stringify(
                        mappedValues,
                        undefined,
                        "    "
                    )},${JSON.stringify(bindingDefs, undefined, "    ")});\n\n`
                );
            throw e;
        }
    };

    const createTable = creatorFactory("table", createTableSql);
    const tableExists = async (db: OracleConnection0): Promise<boolean> => {
        return await dbTableExists(db, table);
    };
    const changesTableExists = async (db: OracleConnection0): Promise<boolean> => {
        return await dbTableExists(db, changesTable);
    };

    if (d.hasChangesTable) {
        const mergeDef: MergeMeta = {
            targetTableName: table,
            sourceTableName: changesTable,
            conditionColumns: d.fields.filter((f) => f.pk).map((f) => f.name),
            dataColumns: d.fields.filter((f) => !f.pk && f.insert).map((f) => f.name),
        };

        const deleteByIssueKeySql = `delete from ${table} where issuekey in (select issuekey from ${settings.tables.ISSUE_T_CHANGES})`;

        const mergeSql = makeMergeSql(mergeDef);
        debugSqlMerge(mergeSql);
        const createChangesTableSql = `create global temporary table ${changesTable} (${columnsInCreateTable}) ON COMMIT PRESERVE ROWS`;

        const executeMergeSql =
            settings.use_stored_procedures && handlerStoredProc ? `BEGIN\n${handlerStoredProc};\nEND;` : mergeSql;

        const executeMerge = async function (db: OracleConnection0) {
            debugSql(`CODE00000043`, executeMergeSql);
            if (d.deleteByIssueKeyBeforeMerge) await db.execute(deleteByIssueKeySql);
            await db.execute(executeMergeSql);
        };

        const extractKeyJs = `(o)=>\`${d.fields
            .filter((f) => (settings.write_into_log_tables ? f.name == "TS" : f.pk))
            .map((f) => "${o." + f.name + "}")
            .join("|")}\``;
        const extractKey = eval(extractKeyJs);

        const createChangesTable = creatorFactory("changesTable", createChangesTableSql);
        const createHandleChangesSP = handlerStoredProc
            ? (() => {
                  let body: string = "";
                  if (d.deleteByIssueKeyBeforeMerge) body += deleteByIssueKeySql + ";\n";
                  body += makeMergeSql(mergeDef) + ";\n";

                  return creatorFactory(
                      "stored procedure",
                      makeProcSql({
                          name: handlerStoredProc,
                          body,
                      })
                  );
              })()
            : undefined;

        return Object.assign(d, {
            tableExists,
            changesTableExists,
            createTableSql,
            createTable,
            dropObjects,
            insertMany,

            createChangesTableSql,
            objectToArray,
            deleteByIssueJeySql: deleteByIssueKeySql,
            mergeSql,

            createChangesTable,
            createHandleChangesSP,
            executeMerge,
            extractKeyJs,
            extractKey,
        });
    } else {
        const extractKeyJs = `(o)=>\`${d.fields
            .filter((f) => (settings.write_into_log_tables ? f.name == "TS" : f.pk))
            .map((f) => "${o." + f.name + "}")
            .join("|")}\``;
        const extractKey = eval(extractKeyJs);
        return Object.assign(d, {
            tableExists,
            changesTableExists,
            createTableSql,
            createTable,
            dropObjects,
            insertMany,

            createChangesTableSql: undefined,
            objectToArray: undefined,
            deleteByIssueJeySql: undefined,
            mergeSql: undefined,

            createChangesTable: undefined,
            createHandleChangesSP: undefined,
            executeMerge: undefined,
            extractKeyJs: extractKeyJs,
            extractKey: extractKey,
        });
    }
};
