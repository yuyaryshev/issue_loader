import { fjmap, formatTypescript, projectDirResolve, strReplace, writeFileSyncIfChanged } from "Ystd";
import { JobFieldInput, JobFieldMeta, makeFieldFromInput } from "Yjob/JobFieldMeta";

export const jobFieldInputs: JobFieldInput[] = [
    { baseField: true, fname: "id", type: "number", skipDeserialize: true },
    { baseField: true, fname: "jobContextId", type: "number", skipDeserialize: true },
    { baseField: true, fname: "key", type: "string", skipDeserialize: true },
    { baseField: true, fname: "priority", type: "number", optional: true },
    { baseField: true, fname: "cancelled", type: "boolean" },
    { baseField: true, fname: "predecessorsDone", type: "boolean" },
    { baseField: true, fname: "jobType", type: "link", skipSerialize: true },
    { baseField: true, fname: "succeded", type: "boolean" },
    { baseField: true, fname: "prevError", type: "string", optional: true },
    { baseField: true, fname: "retryIntervalIndex", type: "number" },
    { baseField: true, fname: "nextRunTs", type: "ts", optional: true },
    { baseField: true, fname: "input", type: "specialInput", skipDeserialize: true },
    {
        baseField: true,
        fname: "result",
        type: "json",
        tableColumn: false,
        optional: true,
        skipSerialize: true,
        skipDeserialize: true,
    },
    { baseField: true, fname: "paused", type: "boolean" },
    { baseField: true, fname: "state", type: "JobState" },
    { baseField: true, fname: "parent", type: "number", optional: true, skipDeserialize: true, tableColumn: true },
];

export const jobResultFieldInputs: JobFieldInput[] = [
    { baseField: true, fname: "id", type: "number", skipDeserialize: true },
    { baseField: true, fname: "result", type: "json", tableColumn: true },
];

// Удалить
//     cancelled
//     running
//     paused
// 	jobSteps
//     currentJobStep
// 	waitType
//
// Добавить
// 	currentJob
//
//

export const contextFieldInputs: JobFieldInput[] = [
    { baseField: true, fname: "id", type: "number", skipDeserialize: true, mem: true },
    { baseField: true, fname: "key", type: "string", skipDeserialize: true, mem: true },
    { baseField: true, fname: "jobsById", type: "JobDict", skipSerialize: true, skipDeserialize: true, mem: false },
    //    { baseField: true, fname: "jobsByKey", type: "JobDict", skipSerialize: true, tableColumn:true },
    { baseField: true, fname: "priority", type: "number", optional: true, mem: true },
    { baseField: true, fname: "predecessorsDone", type: "boolean", mem: true },
    { baseField: true, fname: "jobContextType", type: "link", skipSerialize: true, tableColumn: true, mem: true },
    { baseField: true, fname: "succeded", type: "boolean", mem: true },
    { baseField: true, fname: "prevError", type: "string", optional: true, mem: true },
    { baseField: true, fname: "retryIntervalIndex", type: "number", mem: true },
    { baseField: true, fname: "nextRunTs", type: "ts", optional: true, mem: true },
    { baseField: true, fname: "input", type: "json", skipDeserialize: true, inputHost: true, mem: false },
    { baseField: true, fname: "paused", type: "boolean", mem: true },
    { baseField: true, fname: "timesSaved", type: "number", mem: true },
    { baseField: true, fname: "updatedTs", type: "ts", skipSerialize: true, mem: true },
    { baseField: true, fname: "deleted", type: "boolean", statusOnly: true, mem: false },
    { baseField: true, fname: "state", type: "JobState", mem: true },
    { baseField: true, fname: "stage", type: "string", mem: true },
    { baseField: true, fname: "newIssue", type: "number", mem: true },
];

type getSerializeMode = ["io", "status", "client"];

function genSerializedInterface(interfaceName: string, jobFields: JobFieldMeta[], libMode: boolean) {
    const declStr = libMode ? `Default${interfaceName}` : `${interfaceName} extends Default${interfaceName}`;
    const status = interfaceName.includes("Status");
    return `    
export interface ${declStr} {
    ${fjmap(jobFields, ",\n        ", (f) => (!f.statusOnly || status ? f.interfaceFieldStr : undefined))}        
}
`;
}

function genJobSerializedInterface(interfaceName: string, jobFields: JobFieldMeta[], libMode: boolean) {
    const declStr = libMode ? `Default${interfaceName}` : `${interfaceName} extends Default${interfaceName}`;
    const status = interfaceName.includes("Status");
    return `    
export interface ${declStr} {
    ${fjmap(jobFields, ",\n        ", (f) => f.interfaceFieldStr)}        
}
`;
}

export function genSerializeFields(jobFields: JobFieldMeta[]) {
    const hasInputFields = !!jobFields.filter((f) => f.inputField).length;

    return {
        hasInputFields,
        serializeExplodeFieldStr: hasInputFields
            ? `const { ${fjmap(jobFields, ", ", (f) => f.inputField)}, ...input} = (j.input as any);`
            : "const input = j.input",
        serializeFieldStr: fjmap(jobFields, ",\n        ", (f) => f.serialize),
        serializeStatusFieldStr: fjmap(jobFields, ",\n        ", (f) => f.serializeToStatus),
        deserializeRestoreInputStr: fjmap(jobFields, ";    ", (f) => f.deserializeRestoreInput),
        deserializeFieldStr: fjmap(jobFields, ";\n        ", (f) => f.deserialize),
    };
}

function genSerializeJobFunction(
    suffix: string,
    contextFields: JobFieldMeta[],
    jobFields: JobFieldMeta[],
    libMode: boolean
) {
    const mem = suffix === "Mem";
    const status = suffix === "Status";
    const defaultStr = libMode ? "Default" : "";
    const statusStr = status ? "Status" : "";
    const { serializeExplodeFieldStr } = genSerializeFields(contextFields);
    return `
serialize${suffix}: function serialize${suffix}(j: Job): ${defaultStr}${
        status ? "JobStatus" : "SerializedJob" + (mem ? "Mem" : "")
    } {
    ${serializeExplodeFieldStr}
    

    return {        
    jobType: 'TEST',
        ${fjmap(jobFields, ",\n        ", (f) => f.serialize)}
    };
}
`;
}

function genSerializeJobResultFunction(
    suffix: string,
    contextFields: JobFieldMeta[],
    jobFields: JobFieldMeta[],
    libMode: boolean
) {
    const mem = suffix === "Mem";
    const status = suffix === "Status";
    const defaultStr = libMode ? "Default" : "";
    const statusStr = status ? "Status" : "";
    const { serializeExplodeFieldStr } = genSerializeFields(contextFields);
    return `
serialize${suffix}: function serialize${suffix}(j: Job): ${defaultStr}${
        status ? "JobStatus" : "SerializedJobResult" + (mem ? "Mem" : "")
    } {
    ${serializeExplodeFieldStr}
    

    return {        
        ${fjmap(jobFields, ",\n        ", (f) => f.serialize)}
    };
}
`;
}

function genSerializeJobContextFunction(
    suffix: string,
    contextFields: JobFieldMeta[],
    jobFields: JobFieldMeta[],
    libMode: boolean
) {
    const mem = suffix === "Mem";
    const status = suffix === "Status";
    const defaultStr = libMode ? "Default" : "";
    const statusStr = status ? "Status" : "";
    const { serializeExplodeFieldStr } = genSerializeFields(contextFields);
    return `
serialize${suffix}: function serialize${suffix}(j: JobContext): ${defaultStr}${
        status ? "JobContextStatus" : "SerializedJobContext" + (mem ? "Mem" : "")
    } {
    ${serializeExplodeFieldStr}

    ${
        !mem
            ? `
        for(let jobId in j.jobsById) {
            const sj = j.jobsById[jobId];
        }
    `
            : ""
    }
    

    return {        
        ${status ? `deleted:0,        ` : ""}
        updatedTs:moment().format(),        
        jobContextType: j.jobContextType.type,
        ${fjmap(contextFields, ",\n        ", (f) => f.serialize)}
    };
}
`;
}

export interface JobFieldsGenOptions {
    targetPath: string;
    libMode: boolean;
    client: boolean;
    jobFields: JobFieldInput[];
    jobResultFields: JobFieldInput[];
    contextFields: JobFieldInput[];
}

export function generateJobFieldsTs(options: JobFieldsGenOptions) {
    const targetPath0 = options.targetPath;
    const { libMode, client } = options;
    const defaultStr = libMode ? "Default" : "";
    const contextFields: JobFieldMeta[] = options.contextFields.map(makeFieldFromInput);
    const contextMemFields: JobFieldMeta[] = options.contextFields.map(makeFieldFromInput).filter((f) => f.mem);
    const jobFields: JobFieldMeta[] = options.jobFields.map(makeFieldFromInput);
    const jobMemFields: JobFieldMeta[] = options.jobFields.map(makeFieldFromInput).filter((f) => f.mem);
    const jobResultFields: JobFieldMeta[] = options.jobResultFields.map(makeFieldFromInput);
    const jobResultMemFields: JobFieldMeta[] = options.jobResultFields.map(makeFieldFromInput).filter((f) => f.mem);
    const contextFieldAgg = genSerializeFields(contextFields);
    const jobFieldAgg = genSerializeFields(jobFields);

    const genSourceClient = formatTypescript(`
import { observable } from "mobx";

import moment from "moment";
// @ts-ignore
require("moment-countdown");
import { JobState } from "Yjob/JobState";

export class JobStatus {
    ${fjmap(jobFields, "\n    ", (f) => f.clientClassFieldStr)}
};

export class JobContextStatus {
    ${fjmap(contextFields, "\n    ", (f) => f.clientClassFieldStr)}
};
`);

    const isTableField = (f: JobFieldMeta) => {
        return !f.skipSerialize || f.tableColumn;
    };

    const genSourceServer = formatTypescript(`
import {Job} from ${libMode ? '"./Job"' : '"Yjob"'};
import { JobContextFieldFuncs, JobFieldFuncs, JobResultFieldFuncs, JobStorage } from ${
        libMode ? '"./JobStorage"' : '"Yjob"'
    };
import { JobContext } from ${libMode ? '"./JobContext"' : '"Yjob"'};
import { JobState } from "Yjob/JobState";
import { EnvWithTimers } from "Ystd";

${
    !libMode
        ? `
import {
    DefaultJobContextStatus,
    DefaultJobStatus,
    DefaultSerializedJob,
    DefaultSerializedJobContext,
    DefaultSerializedJobContextMem,
} from "Yjob/JobFieldsServer";
`
        : ""
}

import moment from "moment";
// @ts-ignore
require("moment-countdown");

export const ${
        options.libMode ? "defaultJobContextFieldFuncs" : "jobContextFieldFuncs"
    }: JobContextFieldFuncs<${defaultStr}SerializedJobContext, ${defaultStr}JobContextStatus> = {
    jobContextColumnStr : ${JSON.stringify(
        fjmap(contextFields, ", ", (f) => (isTableField(f) && f.fname) || undefined)
    )},
    jobContextColumnPlaceholderStr : ${JSON.stringify(
        fjmap(contextFields, ", ", (f) => (isTableField(f) && "?") || undefined)
    )},
    jobContextMemColumnStr : ${JSON.stringify(fjmap(contextMemFields, ", ", (f) => f.fname))},
    jobContextMemColumnPlaceholderStr : ${JSON.stringify(fjmap(contextMemFields, ", ", (f) => "?"))},
    
    ${genSerializeJobContextFunction("Status", contextFields, jobFields, options.libMode)},    
    ${genSerializeJobContextFunction("", contextFields, jobFields, options.libMode)},
    ${genSerializeJobContextFunction("Mem", contextMemFields, jobFields, options.libMode)},
    
    serializeToArray:function serializedToArray(o: ${defaultStr}SerializedJobContext) {
    return [
        ${fjmap(contextFields, ",    ", (f) => (isTableField(f) && `o.${f.fname}`) || undefined)}
    ]},
            
    serializeMemToArray:function serializedMemToArray(o: ${defaultStr}SerializedJobContextMem) {
    return [
        ${fjmap(contextMemFields, ",    ", (f) => `o.${f.fname}`)}
    ]},
                
    rowToSerialized: function rowToSerialized(row: any): ${defaultStr}SerializedJobContext {
        for (let k in row) if (row[k] === null) delete row[k];
        const serialized: ${defaultStr}SerializedJobContext = row;
        serialized.input = serialized.input ? JSON.parse(serialized.input) : {};
        
        ${contextFieldAgg.deserializeRestoreInputStr}
        return serialized;
    },
    
    deserialize:function deserialize<TEnv extends EnvWithTimers>(jobStorage: JobStorage<TEnv, ${defaultStr}SerializedJobContext, ${defaultStr}JobContextStatus,${defaultStr}SerializedJob, ${defaultStr}JobStatus>, serialized: ${defaultStr}SerializedJobContext): JobContext {

        const jobContextType = jobStorage.allJobContextTypes[serialized.jobContextType];
        if (!jobContextType)
            throw new Error(\`CODE${"00000000"} jobContextType=\${serialized.jobContextType} - not found!\`);

        const r = new JobContext<any,any,any,any,any,any>(jobContextType, jobStorage, serialized.input, serialized.id, serialized.key, serialized.newIssue);
        
        ${contextFieldAgg.deserializeFieldStr}
        r.jobsById = {} as any;
        let locJobsById = JSON.parse((serialized as any).jobsById);
        for (let jobId in locJobsById) {
            const serializedJob = locJobsById[jobId];

            const jobType = jobStorage.allJobTypes[serializedJob.jobType];

            const jr = new Job(
                jobType,
                r,
                serializedJob.input,
                serializedJob.id,
                serializedJob.key,
                serializedJob.parent, 
                true
            );

            jr.priority = serializedJob.priority;
            jr.cancelled = !!serializedJob.cancelled;
            jr.predecessorsDone = !!serializedJob.predecessorsDone;
            jr.succeded = !!serializedJob.succeded;
            jr.prevError = serializedJob.prevError;
            jr.retryIntervalIndex = serializedJob.retryIntervalIndex;
            jr.nextRunTs = serializedJob.nextRunTs ? moment(serializedJob.nextRunTs) : undefined;
            jr.paused = !!serializedJob.paused;
            jr.state = serializedJob.state;

            r.jobsById[jobId] = jr;
            //r.jobsByKey[jr.key] = jr;
        }
        
        return r;
    }
    

}

/* Client class declaraion
export class JobStatus {
    ${fjmap(jobFields, "\n    ", (f) => f.clientClassFieldStr)}
};

export class JobContextStatus {
    ${fjmap(contextFields, "\n    ", (f) => f.clientClassFieldStr)}
};
*/

/////
export const ${
        options.libMode ? "defaultJobFieldFuncs" : "jobFieldFuncs"
    }: JobFieldFuncs<${defaultStr}SerializedJob, ${defaultStr}JobStatus> = {
    jobColumnStr : ${JSON.stringify(fjmap(jobFields, ", ", (f) => (isTableField(f) && f.fname) || undefined))},
    jobColumnPlaceholderStr : ${JSON.stringify(fjmap(jobFields, ", ", (f) => (isTableField(f) && "?") || undefined))},
    jobMemColumnStr : ${JSON.stringify(fjmap(jobMemFields, ", ", (f) => f.fname))},
    jobMemColumnPlaceholderStr : ${JSON.stringify(fjmap(jobMemFields, ", ", (f) => "?"))},
    
    ${genSerializeJobFunction("Status", jobFields, jobFields, options.libMode)},    
    ${genSerializeJobFunction("", jobFields, jobFields, options.libMode)},
    
    serializeToArray:function serializedToArray(o: ${defaultStr}SerializedJob) {
    return [
        ${fjmap(jobFields, ",    ", (f) => (isTableField(f) && `o.${f.fname}`) || undefined)}
    ]},
            
                
    rowToSerialized: function rowToSerialized(row: any): ${defaultStr}SerializedJob {
        for (let k in row) if (row[k] === null) delete row[k];
        const serialized: ${defaultStr}SerializedJob = row;
        serialized.input = {};
        
        ${jobFieldAgg.deserializeRestoreInputStr}
        return serialized;
    },
    
    deserialize:function deserialize<TEnv extends EnvWithTimers>(jobStorage: JobStorage<TEnv, any, any,${defaultStr}SerializedJob, ${defaultStr}JobStatus>, serialized: ${defaultStr}SerializedJob, jobContext: JobContext): Job {

        const jobType = jobStorage.allJobTypes[serialized.jobType];
        const r = new Job(jobType, jobContext, serialized.input, serialized.id, serialized.key, serialized.parent);
        return r;
    }
    

}
////

////-----
export const ${
        options.libMode ? "defaultJobResultFieldFuncs" : "jobResultFieldFuncs"
    }: JobResultFieldFuncs<any, any> = {
    jobResultColumnStr : ${JSON.stringify(
        fjmap(jobResultFields, ", ", (f) => (isTableField(f) && f.fname) || undefined)
    )},
    jobResultColumnPlaceholderStr : ${JSON.stringify(
        fjmap(jobResultFields, ", ", (f) => (isTableField(f) && "?") || undefined)
    )},
    jobResultMemColumnStr : ${JSON.stringify(fjmap(jobResultMemFields, ", ", (f) => f.fname))},
    jobResultMemColumnPlaceholderStr : ${JSON.stringify(fjmap(jobResultMemFields, ", ", (f) => "?"))},
    
    serialize: function serialize(j: Job): any {
        const input = j.input;

        return {
            id: j.id,
            result: JSON.stringify(j.result),
        };
    },
    
    deserialize:function deserialize<TEnv extends EnvWithTimers>(jobStorage: JobStorage<TEnv, any, any,${defaultStr}SerializedJob, ${defaultStr}JobStatus>, serialized: any, job: Job): Job {
        job.result=serialized.result;
        return job;
    }
    
}
////-----

${genSerializedInterface(
    `JobStatus`,
    jobFields.filter((field) => field.name !== "result"),
    libMode
)}
${genSerializedInterface(
    `SerializedJob`,
    jobFields.filter((field) => field.name !== "result"),
    libMode
)}

export interface ${defaultStr}SerializedJobs {
    [key:string] : ${defaultStr}SerializedJob;
}

export interface ${defaultStr}JobsStatus {
    [key:string] : ${defaultStr}JobStatus;
}

${genSerializedInterface(
    `JobContextStatus`,
    contextFields.filter((field) => field.name !== "jobsById"),
    libMode
)}
${genSerializedInterface(
    `SerializedJobContext`,
    contextFields.filter((field) => field.name !== "jobsById"),
    libMode
)}
${genSerializedInterface(
    `SerializedJobContextMem`,
    contextMemFields.filter((field) => field.name !== "jobsById"),
    libMode
)}

/*
${genSerializedInterface(
    `JobStatus`,
    jobFields.filter((field) => field.name !== "result"),
    libMode
)}
${genSerializedInterface(
    `SerializedJob`,
    jobFields.filter((field) => field.name !== "result"),
    libMode
)}
*/
`);

    const targetPath = projectDirResolve(targetPath0);
    console.log(`targetPath = ${targetPath}`);
    writeFileSyncIfChanged(targetPath, client ? genSourceClient : genSourceServer);
}
