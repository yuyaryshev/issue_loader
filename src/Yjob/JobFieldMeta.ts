import { assertNever } from "assert-never/index";

export type JobFieldType =
    | "json"
    | "string"
    | "boolean"
    | "ts"
    | "link"
    | "number"
    | "JobDict"
    | "JobState"
    | "specialInput";
export type JobFieldSerializedTsType = string;
export type JobFieldRuntimeTsType = "any" | "string" | "boolean" | "number" | "moment.Moment" | "JobState";

export interface JobFieldInput {
    fname: string;
    type: JobFieldType;
    privateField?: boolean;
    skipSerialize?: boolean;
    skipDeserialize?: boolean;
    statusOnly?: boolean;
    optional?: boolean;
    inputField?: boolean;
    inputHost?: boolean; // Set only for "input" in JobContext
    baseField?: boolean;
    calc?: boolean;
    tableColumn?: boolean;
    mem?: boolean;
}

// export interface JobFieldMeta {
//     fullJobField: true; // Field is set when JobFieldInput is transformed to JobField
//     serializedTsType: JobFieldSerializedTsType;
//     runtimeTsType: JobFieldRuntimeTsType;
//     clientDefaultValueInitializer: string;
//     name: string;
//     inputField: string;
//     baseField: boolean;
//     calc: boolean;
//
//     clientClassFieldStr: string;
// }

export const makeFieldFromInput = (f: JobFieldInput) => {
    let { fname, type, optional, baseField, privateField, statusOnly } = f;
    const inputField = f.inputField ? fname : undefined;
    const name = (privateField ? "_" : "") + fname;

    if (statusOnly) {
        f.skipSerialize = true;
        optional = f.optional = true;
    }

    let serializedTsType: JobFieldSerializedTsType;
    let runtimeTsType: JobFieldRuntimeTsType;
    let clientDefaultValueInitializer: string;
    let serializeToStatusValue: string;
    let serializeValue: string;
    let deserialize: string;

    let obj = baseField ? "j" : "(j as any)";
    let vf = `${obj}.${fname}`;
    if (inputField || f.inputHost) vf = fname;

    switch (type) {
        case "specialInput":
            serializedTsType = "any";
            runtimeTsType = "any";
            clientDefaultValueInitializer = "undefined";
            serializeValue = `"{}"`;
            serializeToStatusValue = `(${serializeValue} || "(empty)").substr(0,80)`;
            deserialize = `${baseField ? "r" : "(r as any)"}.${name} = serialized.${fname}`;
            break;
        case "json":
            serializedTsType = "any";
            runtimeTsType = "any";
            clientDefaultValueInitializer = "undefined";
            serializeValue = `JSON.stringify(${vf})`;
            serializeToStatusValue = `(${serializeValue} || "(empty)").substr(0,80)`;
            deserialize = `${
                baseField ? "r" : "(r as any)"
            }.${name} = serialized.${fname} && JSON.parse(serialized.${fname})`;
            break;
        case "string":
        case "JobState":
            serializedTsType = type;
            runtimeTsType = type;
            clientDefaultValueInitializer = '"" as any';
            serializeValue = `JSON.stringify(${vf})`;
            serializeToStatusValue = serializeValue = `${vf}`;
            deserialize = `${baseField ? "r" : "(r as any)"}.${name} = serialized.${fname}`;
            break;
        case "boolean":
            serializedTsType = "number";
            runtimeTsType = "boolean";
            clientDefaultValueInitializer = "0";
            serializeToStatusValue = serializeValue = `(${vf} ? 1 : 0)`;
            deserialize = `${baseField ? "r" : "(r as any)"}.${name} = !!serialized.${fname}`;
            break;
        case "number":
            serializedTsType = "number";
            runtimeTsType = "number";
            clientDefaultValueInitializer = "0";
            serializeToStatusValue = serializeValue = `${vf}`;
            deserialize = `${baseField ? "r" : "(r as any)"}.${name} = serialized.${fname}`;
            break;
        case "ts":
            serializedTsType = "string";
            runtimeTsType = "moment.Moment";
            clientDefaultValueInitializer = '""';
            if (optional) {
                serializeToStatusValue = serializeValue = `${vf} ? ${vf}.format() : undefined`;
                deserialize = `${
                    baseField ? "r" : "(r as any)"
                }.${name} = serialized.${fname} ? moment(serialized.${fname}) : undefined`;
            } else {
                serializeToStatusValue = serializeValue = `${vf}.format()`;
                deserialize = `${baseField ? "r" : "(r as any)"}.${name} = moment(serialized.${fname})`;
            }
            break;
        case "link":
            serializedTsType = "string";
            runtimeTsType = "string";
            clientDefaultValueInitializer = '""';
            serializeToStatusValue = serializeValue = `${vf} ? ${vf}.id : undefined`;
            deserialize = `${
                baseField ? "r" : "(r as any)"
            }.${name} = serialized.${fname} ? serialized.${fname}.id : undefined`;
            break;
        case "JobDict":
            serializedTsType = "any";
            runtimeTsType = "any";
            clientDefaultValueInitializer = "{}";
            serializeToStatusValue = serializeValue = `undefined`;
            deserialize = `undefined`;
            break;
        default:
            assertNever(type);
    }
    let serialize = `${fname}: ${serializeValue}`;
    let serializeToStatus = `${fname}: ${serializeValue}`;

    if (f.skipSerialize) serializeToStatus = serialize = serializeToStatusValue = serializeValue = "";
    if (f.skipSerialize || f.skipDeserialize) deserialize = "";

    if (!serializedTsType) throw new Error(`CODE00000173 Unknown type ${type} while creating const jobFields`);
    if (optional) serializedTsType += " | undefined";

    const clientClassFieldStr = `@observable ${fname}: ${serializedTsType}=${clientDefaultValueInitializer};`;
    const deserializeRestoreInput = inputField
        ? `(serialized as any).input.${f.fname} = (serialized as any).${f.fname};`
        : "";

    const interfaceFieldStr = `${fname}: ${serializedTsType}`;

    return {
        ...f,
        fullJobField: true,
        serializedTsType,
        runtimeTsType,
        clientDefaultValueInitializer,
        name,
        inputField,
        baseField: !!f.baseField,
        calc: !!f.calc,

        clientClassFieldStr,
        interfaceFieldStr,
        serialize,
        deserialize,
        deserializeRestoreInput,
        serializeToStatus,
    };
};

export type JobFieldMeta = ReturnType<typeof makeFieldFromInput>;
