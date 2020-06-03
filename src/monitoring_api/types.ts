import { boolean, constant, Decoder, number, object, oneOf, optional, string } from "@mojotech/json-type-validation";
import { Env } from "other";
import { decoderDomainFieldType, decoderFieldLoadAlg, DJiraFieldMarkedMeta } from "dbDomains";
import { decoderModeName, ModeName } from "../entry_scripts";

export interface Api {
    name: string;
    func: (env: Env) => Promise<void> | void;
}

export interface RunIssuesRequest {
    objType: string;
    objectsForStart: string;
    mode: ModeName;
    allProjects?: boolean;
}

export const decoderRunIssuesRequest: Decoder<RunIssuesRequest> = object({
    objType: string(),
    objectsForStart: string(),
    mode: decoderModeName,
    allProjects: optional(boolean()),
});

export interface SqlApiRequest {
    sql: string;
    limit_rows?: number;
}

export const decoderSqlApiRequest: Decoder<SqlApiRequest> = object({
    sql: string(),
    limit_rows: optional(number()),
});
