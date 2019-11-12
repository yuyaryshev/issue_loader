import oracledb from "oracledb";
import { EnvSettings } from "./startEnv";
import { Decoder, object, string, number, boolean, optional, oneOf, constant } from "@mojotech/json-type-validation";
import { yconsole } from "./consoleMsg";
import { makeMergeSql, makeMergeProc } from "./generateSql";
import { creatorFactory } from "./oracleFuncs";
import { debugMsgFactory } from "./consoleMsg";
const debugSql = debugMsgFactory("sql");

export const oracleTypes = {
    string40: { name: "varchar2(40)", bindType: { type: oracledb.STRING, maxSize: 40 } },
    string100: { name: "varchar2(100)", bindType: { type: oracledb.STRING, maxSize: 100 } },
    string255: { name: "varchar2(255)", bindType: { type: oracledb.STRING, maxSize: 255 } },
    string2000: { name: "varchar2(2000)", bindType: { type: oracledb.STRING, maxSize: 2000 } },
    string4000: { name: "varchar2(4000)", bindType: { type: oracledb.STRING, maxSize: 4000 } },
    dwh_flag: { name: "varchar2(1)", bindType: { type: oracledb.STRING, maxSize: 1 } },
    integer: { name: "number", bindType: { type: oracledb.NUMBER } },
    number: { name: "number", bindType: { type: oracledb.NUMBER } },
    date: { name: "date", bindType: { type: oracledb.STRING } },
    datetime: { name: "timestamp(6) with time zone", bindType: { type: oracledb.STRING, maxSize: 30 } },
    json: { name: "clob", bindType: { type: oracledb.CLOB } }
};

export type DomainFieldType =
    | "string40"
    | "string100"
    | "string255"
    | "string2000"
    | "string4000"
    | "integer"
    | "number"
    | "date"
    | "datetime"
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
    constant("date"),
    constant("datetime"),
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

export interface DbDomainInput<FT extends DbDomFieldInput = DbDomFieldInput> {
    indexOrganized?: boolean;
    name: string;
    table: string;
    changesTable: string | undefined;
    handlerStoredProc: string | undefined;
    fields: FT[];
    additionalMapper?: any;
}

export interface PreperedDbDomain {
    createTableSql: string;
    createTable: (db: oracledb.Connection) => Promise<void>;
    insertMany: (db: oracledb.Connection, values: any[]) => Promise<void>;

    createChangesTableSql?: string;
    objectToInsertRowFunc?: (f: any)=> any;
    mergeSql?: string;

    createChangesTable?: (db: oracledb.Connection) => Promise<void>;
    createHandleChangesSP?: (db: oracledb.Connection) => Promise<void>;
    executeMerge?:(db: oracledb.Connection) => Promise<void>;
}

export type InferDbDomain = ReturnType<typeof prepareDbDomain>;
export const prepareDbDomain = <FT extends DbDomFieldInput, DT extends DbDomainInput<FT>>(settings: EnvSettings, d: DT): PreperedDbDomain => {
    // @ts-ignore
    d.table = settings.tables[d.table] || d.table;

    // @ts-ignore
    d.changesTable = settings.tables[d.changesTable] || d.changesTable;
    const targetTable = d.changesTable || d.table;

    // @ts-ignore
    d.handlerStoredProc = settings.stored_procedures[d.handlerStoredProc] || d.handlerStoredProc;

    const insertSql = `insert into ${targetTable} (
        ${d.fields
            .filter(f => f.insert)
            .map(f => f.name)
            .join(",\n")}
    ) values(${d.fields
        .filter(f => f.insert)
        .map((f, i) => f.insert && ":" + (i + 1))
        .join(",")})`;

    const insertBindDefs = d.fields.filter(f => f.insert).map(f => Object.assign({}, oracleTypes[f.type].bindType));

    const columnsInCreateTable = d.fields
        .map(
            f =>
                `    ${f.name} ${f.oracleType || oracleTypes[f.type].name} ${
                    f.defaultValue ? "default " + f.defaultValue : ""
                } ${f.nullable ? "" : "not null"}`
        )
        .join(",\n");

    const pkColumnsStr = d.fields
        .filter(f => f.pk)
        .map(f => f.name)
        .join(", ");

    const pkStr = pkColumnsStr.length ? `, PRIMARY KEY (${pkColumnsStr})` : "";

    const createTableSql = `create table ${d.table} (${columnsInCreateTable} ${pkStr}) ${
        d.indexOrganized ? "ORGANIZATION INDEX PCTTHRESHOLD 10" : ""
    }`;

    const objectToArray = eval(
        `f => [${d.fields
            .filter(f => f.insert)
            .map(f => "f." + f.name)
            .join(",")}]`
    ) as any;

    const objectToInsertRowFunc = d.additionalMapper ? (a: any) => objectToArray(d.additionalMapper(a)) : objectToArray;

    const insertMany = async function(db: oracledb.Connection, values: any[]) {
        debugSql(`T3006`, insertSql);
        const mappedValues = values.map(objectToInsertRowFunc) as any[];
        const bindingDefs = {
            autoCommit: true,
            bindDefs: insertBindDefs
        };

        try {
            await db.executeMany(insertSql, mappedValues);
        } catch (e) {
            yconsole.log(
                `T8801`,
                `Code for easy sql debugging:\nawait db.executeMany(\`${insertSql}\`,${JSON.stringify(
                    mappedValues
                )},${JSON.stringify(bindingDefs)});`
            );
            throw e;
        }
    };

    const createTable = creatorFactory("table", createTableSql);

    if (d.changesTable) {
        const mergeDef = {
            name: d.handlerStoredProc || "",
            targetTableName: d.table,
            sourceTableName: d.changesTable,
            conditionColumns: d.fields.filter(f => f.pk).map(f => f.name),
            dataColumns: d.fields.filter(f => !f.pk && f.insert).map(f => f.name)
        };

        const mergeSql = makeMergeSql(mergeDef);
        const createChangesTableSql = `create global temporary table ${d.changesTable} (${columnsInCreateTable}) ON COMMIT PRESERVE ROWS`;

        const executeMergeSql =
            settings.use_stored_procedures && d.handlerStoredProc ? `BEGIN\n${d.handlerStoredProc};\nEND;` : mergeSql;
        const executeMerge = async function (db: oracledb.Connection) {
            debugSql(`T3002`, executeMergeSql);
            await db.execute(executeMergeSql);
        };

        const createChangesTable = creatorFactory("changesTable", createChangesTableSql);
        const createHandleChangesSP = d.handlerStoredProc
            ? creatorFactory("stored procedure", makeMergeProc(mergeDef))
            : undefined;

        return Object.assign(d, {
            createTableSql,
            createTable,
            insertMany,

            createChangesTableSql,
            objectToInsertRowFunc,
            mergeSql,

            createChangesTable,
            createHandleChangesSP,
            executeMerge
        });
    } else
        return Object.assign(d, {
            createTableSql,
            createTable,
            insertMany,

            createChangesTableSql: undefined,
            objectToInsertRowFunc: undefined,
            mergeSql: undefined,

            createChangesTable: undefined,
            createHandleChangesSP: undefined,
            executeMerge: undefined
        });
};
