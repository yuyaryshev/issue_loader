import { DJiraFieldMarkedMeta, oracleTypes } from "dbDomains";

export interface MergeMeta {
    targetTableName: string;
    sourceTableName: string;
    conditionColumns: string[];
    dataColumns: string[];
}

export const makeMergeSql = (m: MergeMeta) => {
    // TODO_NEXT makeMergeSql Загрузка удалений - промечаем deleted_flag - те, которые отсутствуют, для этого добавить флаг в настройки и если он задан, тогда в USING добавлять join с выводом DELETED_FLAG
    const insertColumns = [...m.conditionColumns, ...m.dataColumns];
    return `
    MERGE INTO ${m.targetTableName} a
    USING ${m.sourceTableName} b
    ON (${m.conditionColumns.map(c => `a.${c} = b.${c}`).join(" and ")}) 
    ${m.dataColumns.length ? "WHEN MATCHED THEN UPDATE SET" : ""} ${m.dataColumns.map(c => `${c} = b.${c}`).join(", ")} 
    WHEN NOT MATCHED THEN INSERT ( ${insertColumns.map(c => `a.${c}`).join(", ")} ) 
    VALUES ( ${insertColumns.map(c => `b.${c}`).join(", ")} ) 
    `.trim();
};

export interface ProcParamMeta {
    name: string;
    in: "in" | "out" | "in out";
    type: string;
    default?: string;
}

export interface ProcMeta {
    name: string;
    params?: ProcParamMeta[];
    vars?: string;
    body: string;
    exceptionHandler?: string;
}

export const makeProcSql = (m: ProcMeta) => {
    return `
create or replace procedure ${m.name} ${
        m.params && m.params.length
            ? "(" + m.params.map(p => `${p.name} ${p.in} ${p.type} ${p.default ? ":=" + p.default : ""}`) + ")"
            : ""
    } is
    ${m.vars || ""}
    begin 
    ${m.body}
    ${m.exceptionHandler ? "EXCEPTION\n" : ""}
    end;
`.trim();
};

export interface CreateIssueTableMeta {
    name: string;
    fields: DJiraFieldMarkedMeta[];
}

export const makeCreateIssueTableSql = (m: CreateIssueTableMeta) => {
    return `create global temporary table ${m.name} (
      ${m.fields.map(f => `${f.TARGET_NAME} ${oracleTypes[f.ISSUE_LOADER_TYPE].name}`).join(",\n")}
    )
`.trim();
};
