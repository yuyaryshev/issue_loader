import moment from "moment";

export const isoDateFormat = "YYYY-MM-DD HH:mm:ss";
export let prefixSize = 19;

export type Severity = "F" | "E" | "W" | "I" | "D";
export type SeverityLong = "FATAL" | "ERROR" | "WARN " | "INFO " | "DEBUG";

export interface YConsoleMsg {
    ts: string;
    cpl: string;
    severity: Severity;
    prefix: string;
    message: string;
    data?: any[];
}

export const severityLongStr = (severity: Severity): SeverityLong => {
    switch (severity) {
        case "D":
            return "DEBUG";
        case "E":
            return "ERROR";
        case "F":
            return "FATAL";
        case "I":
            return "INFO ";
        case "W":
            return "WARN ";
    }
    return "ERROR";
};

export const yconsoleFormatMsg = (m: YConsoleMsg) =>
    `${severityLongStr(m.severity)} ${m.cpl} ${m.ts} ${(m.prefix + "                             ").substr(
        0,
        prefixSize
    )} - ${m.message}`;

export const debugMsgFactory = (prefix: string) => {
    if (process.env.DEBUG) {
        const splitted = process.env.DEBUG.split(" ");

        for (let s of splitted)
            if (prefix.startsWith(s))
                return (cpl: string, message: string, ...data: any[]) => {
                    const m: YConsoleMsg = {
                        ts: moment().format(isoDateFormat),
                        cpl,
                        severity: "D",
                        prefix,
                        message,
                        data,
                    };

                    if (!(global as any).logger || (global as any).logger(m) === true)
                        console.log(yconsoleFormatMsg(m), ...data);
                };
        // Implementation with debug - not working in VSCode...
        // const debugFunc = debugjs(prefix);
        // return (cpl: string, ...args: any[]) =>
        //     debugFunc(cpl, moment().format(isoDateFormat), " - ", ...args);
    }

    return (() => {}) as any;
};

export const yconsole = {
    debug: (cpl: string, message: string | Error, ...data: any[]) => {
        if (message instanceof Error) {
            data = [message.stack, ...data];
            message = message.message;
        }

        const m: YConsoleMsg = {
            ts: moment().format(isoDateFormat),
            cpl,
            severity: "D",
            prefix: "",
            message,
            data,
        };

        if (!(global as any).logger || (global as any).logger(m)) console.log(yconsoleFormatMsg(m), ...data);
    },

    log: (cpl: string, message: string | Error, ...data: any[]) => {
        if (message instanceof Error) {
            data = [message.stack, ...data];
            message = message.message;
        }

        const m: YConsoleMsg = {
            ts: moment().format(isoDateFormat),
            cpl,
            severity: "I",
            prefix: "",
            message,
            data,
        };

        if (!(global as any).logger || (global as any).logger(m)) console.log(yconsoleFormatMsg(m), ...data);
    },

    warn: (cpl: string, message: string | Error, ...data: any[]) => {
        if (message instanceof Error) {
            data = [message.stack, ...data];
            message = message.message;
        }

        const m: YConsoleMsg = {
            ts: moment().format(isoDateFormat),
            cpl,
            severity: "W",
            prefix: "",
            message,
            data,
        };

        if (!(global as any).logger || (global as any).logger(m)) console.warn(yconsoleFormatMsg(m), ...data);
    },

    error: (cpl: string, message: string | Error, ...data: any[]) => {
        if (message instanceof Error) {
            data = [message.stack, ...data];
            message = message.message;
        }

        const m: YConsoleMsg = {
            ts: moment().format(isoDateFormat),
            cpl,
            severity: "E",
            prefix: "",
            message,
            data,
        };

        if (!(global as any).logger || (global as any).logger(m)) console.error(yconsoleFormatMsg(m), ...data);
    },

    fatal: (cpl: string, message: string | Error, ...data: any[]) => {
        if (message instanceof Error) {
            data = [message.stack, ...data];
            message = message.message;
        }

        const m: YConsoleMsg = {
            ts: moment().format(isoDateFormat),
            cpl,
            severity: "F",
            prefix: "",
            message,
            data,
        };

        if (!(global as any).logger || (global as any).logger(m)) console.trace(yconsoleFormatMsg(m), ...data);
    },
};
