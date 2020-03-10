import { assertNever } from "assert-never";
import { resolve, sep } from "path";
import { formatTypescript, projectDirResolve, writeFileSyncIfChanged } from "Ystd";

export type JobFieldType = "json" | "string" | "boolean" | "ts" | "link" | "number";
export type JobFieldSerializedTsType = "any" | "string" | "number";
export type JobFieldRuntimeTsType = "any" | "string" | "boolean" | "number" | "moment.Moment";

export interface JobFieldInput {
    fname: string;
    type: JobFieldType;
    privateField?: boolean;
    skipSerializeJobFields?: boolean;
    skipDeserializeJobFields?: boolean;
    optional?: boolean;
    inputField?: boolean;
    baseField?: boolean;
}

export interface JobField extends JobFieldInput {
    fullJobField: true; // Field is set when JobFieldInput is transformed to JobField
    serializedTsType: JobFieldSerializedTsType;
    runtimeTsType: JobFieldRuntimeTsType;
    clientDefaultValueInitializer: string;
    name: string;
    inputField: boolean;
    baseField: boolean;
}

export const jobFieldInputs: JobFieldInput[] = [
    { baseField: true, fname: "id", type: "string", skipDeserializeJobFields: true },
    { baseField: true, fname: "parent", type: "string", skipDeserializeJobFields: true, optional: true },
    { baseField: true, fname: "key", type: "string", skipDeserializeJobFields: true },
    { baseField: true, fname: "priority", type: "number", optional: true },
    { baseField: true, fname: "cancelled", type: "boolean" },
    { baseField: true, fname: "deps_succeded", type: "boolean" },
    { baseField: true, fname: "createdTs", type: "ts" },
    { baseField: true, fname: "finishedTs", type: "ts", optional: true },
    { baseField: true, fname: "jobType", type: "link", skipSerializeJobFields: true },
    { baseField: true, fname: "succeded", type: "boolean" },
    { baseField: true, fname: "startedTs", type: "ts", optional: true },
    { baseField: true, fname: "prevError", type: "string", optional: true },
    { baseField: true, fname: "retryIntervalIndex", type: "number" },
    { baseField: true, fname: "nextRunTs", type: "ts", optional: true },
    { baseField: true, fname: "input", type: "json", skipDeserializeJobFields: true },
    { baseField: true, fname: "prevResult", type: "json", optional: true },
    { baseField: true, fname: "paused", type: "boolean" },
    { baseField: true, fname: "timesSaved", type: "number" },
    { baseField: true, fname: "updatedTs", type: "ts", optional: true, skipSerializeJobFields: true },
    { baseField: true, fname: "deleted", type: "boolean", optional: true, skipSerializeJobFields: true },
];

export const makeJobFieldFromInput = (f: JobFieldInput): JobField => {
    let serializedTsType: JobFieldSerializedTsType | undefined;
    let runtimeTsType: JobFieldRuntimeTsType | undefined;
    let clientDefaultValueInitializer: string;

    switch (f.type) {
        case "json":
            serializedTsType = "any";
            runtimeTsType = "any";
            clientDefaultValueInitializer = "undefined";
            break;
        case "string":
            serializedTsType = "string";
            runtimeTsType = "string";
            clientDefaultValueInitializer = '""';
            break;
        case "boolean":
            serializedTsType = "number";
            runtimeTsType = "boolean";
            clientDefaultValueInitializer = "0";
            break;
        case "number":
            serializedTsType = "number";
            runtimeTsType = "number";
            clientDefaultValueInitializer = "0";
            break;
        case "ts":
            serializedTsType = "string";
            runtimeTsType = "moment.Moment";
            clientDefaultValueInitializer = '""';
            break;
        case "link":
            serializedTsType = "string";
            runtimeTsType = "string";
            clientDefaultValueInitializer = '""';
            break;
        default:
            assertNever(f.type);
    }

    if (!serializedTsType) throw new Error(`CODE00000002 Unknown type ${f.type} while creating const jobFields`);
    return {
        ...f,
        serializedTsType,
        runtimeTsType,
        clientDefaultValueInitializer,
        name: (f.privateField ? "_" : "") + f.fname,
        fullJobField: true,
        inputField: !!f.inputField,
        baseField: !!f.baseField,
    };
};

type getSerializeMode = ["io", "status", "client"];

function genSerializeClient(jobFields: JobField[], options: JobFieldsGenOptions) {
    return `
    class JobStatus {
    ${jobFields
        .map(
            f =>
                `@observable ${f.fname}${options.typings ? `${f.optional ? "?" : ""}: ${f.serializedTsType}` : ""}=${
                    f.clientDefaultValueInitializer
                };`
        )
        .filter(s => s && s.length)
        .join("\n    ")}        
    };
    `;
}

function genSerializeInterface(jobFields: JobField[], toStatus: boolean, options: JobFieldsGenOptions) {
    return `
    ${toStatus ? `/* Client class declaraion ${genSerializeClient(jobFields, options)} */` : ""}
    
export interface ${options.libMode ? "Default" : ""}${toStatus ? "JobStatus" : "SerializedJob"} {
    ${jobFields
        .map(f => `${f.fname}${f.optional ? "?" : ""}: ${f.serializedTsType}`)
        .filter(s => s && s.length)
        .join(",\n        ")}        
}
`;
}

function genSerializeFunction(jobFields: JobField[], toStatus: boolean, options: JobFieldsGenOptions) {
    const hasInputFields = !!jobFields.filter(f => f.inputField).length;
    return `
serializeJob${toStatus ? "Status" : ""}: function serializeJob${toStatus ? "Status" : ""}(job: Job): ${
        options.libMode ? "Default" : ""
    }${toStatus ? "JobStatus" : "SerializedJob"} {
    ${
        hasInputFields
            ? `const { ${jobFields
                  .filter(f => f.inputField)
                  .map(f => f.name)
                  .join(", ")}, ...input} = (job.input as any);`
            : ""
    }

    return {
        jobType: job.jobType.type,
        ${jobFields
            .filter(f => !f.skipSerializeJobFields)
            .map(f => {
                let varField = `${f.baseField ? "job" : "(job as any)"}.${f.name}`;
                if (hasInputFields && (f.inputField || f.name === "input")) varField = f.name;

                switch (f.type) {
                    case "json":
                        if (toStatus) return `${f.fname}: (JSON.stringify(${varField}) || "(empty)").substr(0,80)`;
                        return `${f.fname}: JSON.stringify(${varField})`;
                    case "string":
                        return `${f.fname}: ${varField}`;
                    case "boolean":
                        return `${f.fname}: (${varField} ? 1 : 0)`;
                    case "number":
                        return `${f.fname}: ${varField}`;
                    case "ts":
                        if (f.optional) return `${f.name}: ${varField} ? ${varField}.format() : undefined`;
                        return `${f.fname}: ${varField}.format()`;
                    case "link":
                        return `${f.fname}: ${varField} ? ${varField}.id : undefined`;
                    default:
                        assertNever(f.type);
                }
            })
            .join(",\n        ")}
    };
}
`;
}

export interface JobFieldsGenOptions {
    targetPath: string;
    libMode: boolean;
    client: boolean;
    typings: boolean;
    jobFields: JobFieldInput[] | JobField[];
}

export function generateJobFieldsTs(options: JobFieldsGenOptions) {
    const targetPath0 = options.targetPath;
    const jobFieldInputs = options.jobFields;
    const { libMode, client } = options;

    const jobFields: JobField[] = jobFieldInputs as any;
    for (let i = 0; i < jobFields.length; i++) {
        const jobField = jobFields[i];
        if (!jobFields[i].fullJobField) jobFields[i] = makeJobFieldFromInput(jobFields[i]);
    }

    const genSourceClient = formatTypescript(`
import { observable } from "mobx";

import moment from "moment";
// @ts-ignore
require("moment-countdown");

${genSerializeClient(jobFields, options)}
`);

    const genSourceServer = formatTypescript(`
import {Job} from ${libMode ? '"./Job"' : '"Yjob"'};
import { JobFieldFuncs, JobStorage } from ${libMode ? '"./JobStorage"' : '"Yjob"'};

import moment from "moment";
// @ts-ignore
require("moment-countdown");

export const ${options.libMode ? "defaultJobFieldFuncs" : "jobFieldFuncs"} = {
    jobColumnStr : ${JSON.stringify(jobFields.map(f => f.fname).join(", "))},
    jobColumnPlaceholderStr : ${JSON.stringify(jobFields.map(f => ":" + f.fname).join(", "))},
    
    ${genSerializeFunction(jobFields, true, options)},
    
    ${genSerializeFunction(jobFields, false, options)},

    serializedToArray:function serializedToArray(o: ${options.libMode ? "Default" : ""}SerializedJob) {
    return [
        ${jobFields.map(f => `o.${f.fname}`).join(",    ")}
    ]},
            
    deserializeJob:function deserializeJob<TEnv>(jobStorage: JobStorage<TEnv>, jobRow: any): Job {
    for (let k in jobRow) if (jobRow[k] === null) delete jobRow[k];
    const serialized: ${options.libMode ? "Default" : ""}SerializedJob = jobRow;
    serialized.input = serialized.input ? JSON.parse(serialized.input) : undefined;
    
    ${jobFields
        .filter(f => f.inputField)
        .map(f => {
            return `(serialized as any).input.${f.fname} = (serialized as any).${f.fname};`;
        })
        .join(";    ")}
    
    const jobType = jobStorage.allJobTypes[serialized.jobType];
    if (!jobType)
        //
        throw new Error(\`CODE${"00000000"} jobType=\${serialized.jobType} - not found!\`);

    // let r_parent: Job | undefined;
    // if (serialized.parent) r_parent = jobStorage.findJobById(env, serialized.parent);


    const r = new Job(jobType, jobStorage, serialized.input, serialized.id, serialized.key, serialized.parent);
    
    ${jobFields
        .filter(f => !(f.skipSerializeJobFields || f.skipDeserializeJobFields))
        .map(f => {
            switch (f.type) {
                case "json":
                    return `${f.baseField ? "r" : "(r as any)"}.${f.name} = serialized.${
                        f.fname
                    } && JSON.parse(serialized.${f.fname})`;
                case "string":
                    return `${f.baseField ? "r" : "(r as any)"}.${f.name} = serialized.${f.fname}`;
                case "boolean":
                    return `${f.baseField ? "r" : "(r as any)"}.${f.name} = !!serialized.${f.fname}`;
                case "number":
                    return `${f.baseField ? "r" : "(r as any)"}.${f.name} = serialized.${f.fname}`;
                case "ts":
                    if (f.optional)
                        return `${f.baseField ? "r" : "(r as any)"}.${f.name} = serialized.${
                            f.fname
                        } ? moment(serialized.${f.fname}) : undefined`;
                    return `${f.baseField ? "r" : "(r as any)"}.${f.name} = moment(serialized.${f.fname})`;
                case "link":
                    return `${f.baseField ? "r" : "(r as any)"}.${f.name} = serialized.${f.fname} ? serialized.${
                        f.fname
                    }.id : undefined`;
                default:
                    assertNever(f.type);
            }
        })
        .join(";\n        ")}
    return r;
}

}

${genSerializeInterface(jobFields, true, options)}
${genSerializeInterface(jobFields, false, options)}

`);

    const targetPath = projectDirResolve(targetPath0);
    console.log(`targetPath = ${targetPath}`);
    writeFileSyncIfChanged(targetPath, client ? genSourceClient : genSourceServer);
}

/*

*/
