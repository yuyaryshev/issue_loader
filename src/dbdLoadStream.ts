import { Env } from "./startEnv";
import { DbDomFieldInput, DbDomainInput } from "./dbDomain";
import { Connection } from "oracledb";
import {
    Decoder,
    object,
    string,
    number,
    boolean,
    optional,
    oneOf,
    constant,
    anyJson
} from "@mojotech/json-type-validation";
import { yconsole } from "./consoleMsg";
import { mockableRequest } from "./mockableRequest";
import { DomainFieldType, decoderDomainFieldType } from "./dbDomain";
import { assertNever } from "assert-never";

export type LoadStreamType = "jira";
export const decoderLoadStreamType: Decoder<LoadStreamType> = oneOf(constant("jira"));

// TODO_NEXT использовать отдельные логи для каждого stream
// TODO_NEXT каждый stream пишет в свой runLog, который очищается каждый запуск, а еще - дублируется в консоль (или куда-то)

export interface IssueStreamRunStatus {
    id: string;
    lastRun: string;
    lastRunOk: boolean;
    lastCount: number;
    lastTotal: number;
    countToday: number;
    count10min: number;
    errors: string[];
    busy: boolean;
    status: string;
    partStatuses: string[];
}

export function newIssueStreamRunStatus(id: string): IssueStreamRunStatus {
    return {
        id,
        lastRun: "",
        lastRunOk: true,
        lastCount: 0,
        lastTotal:0,
        countToday: 0,
        count10min: 0,
        errors: [],
        status: "",
        busy: false,
        partStatuses:[],
    }    
}

export function setLsPartStatus(ls:LoadStream, index:number, status: string, comment?: string) {
    ls.status.partStatuses[index] = status;
    if (ls.status.partStatuses.length) {
        ls.status.status = ls.status.partStatuses[0];
        for(let s2 of ls.status.partStatuses)
            if(s2 < ls.status.status)
                ls.status.status = s2;
    }
}

export function setLsStatus(ls:LoadStream, status: string, comment?: string) {
    ls.status.partStatuses = [];
    ls.status.status = status;
}


export interface LoadStream {
    ID: string;
    TYPE: LoadStreamType;
    CONDITION: string;
    ENABLED: boolean;
    LAST_UPDATED_TS?: string | undefined;
    idle: boolean;
    status: IssueStreamRunStatus;
}

export interface LoadStreams {
    [key: string]: LoadStream;
}

export const decoderLoadStream: Decoder<LoadStream> = object({
    ID: string(),
    TYPE: decoderLoadStreamType,
    CONDITION: string(),
    ENABLED: boolean(),
    LAST_UPDATED_TS: optional(string()),
    idle: boolean(),
    status: anyJson()
});

export const dbdLoadStreamInput = {
    name: "LOAD_STREAM",
    table: "LOAD_STREAM",
    changesTable: undefined,
    handlerStoredProc: undefined,
    fields: [
        { name: "ID", type: "string40", nullable: false, pk: true, insert: true } as DbDomFieldInput,
        { name: "TYPE", type: "string40", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "CONDITION", type: "string255", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "ENABLED", type: "dwh_flag", nullable: false, pk: false, insert: true } as DbDomFieldInput,
        { name: "LAST_UPDATED_TS", type: "string40", nullable: true, pk: false, insert: true } as DbDomFieldInput
    ] as DbDomFieldInput[]
} as DbDomainInput;
