import oracledb from "oracledb";

const typeExtractorFunc = () => {
    const r: oracledb.Connection = undefined as any;
    return {
        commit: r.commit,
        executeMany: r.executeMany,
        execute: r.execute,
        close: r.close,
    };
};

export type OracleConnection0 = ReturnType<typeof typeExtractorFunc>;
