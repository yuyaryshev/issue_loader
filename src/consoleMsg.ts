import moment from "moment";
import debugjs from "debug";

export const isoDateFormat = "YYYY-MM-DD hh:mm:ss";

export const debugMsgFactory = (prefix: string) => {
    if (process.env.DEBUG) {
        const splitted = process.env.DEBUG.split(" ");

        for (let s of splitted)
            if (prefix.startsWith(s))
                return (tcode: string, ...args: any[]) =>
                    console.log(
                        tcode,
                        " DEBUG ",
                        (prefix + "                             ").substr(0, 19),
                        " - ",
                        ...args
                    );

        // Implementation with debug - not working in VSCode...
        // const debugFunc = debugjs(prefix);
        // return (tcode: string, ...args: any[]) =>
        //     debugFunc(tcode, moment().format(isoDateFormat), " - ", ...args);
    }

    return (() => {}) as any;
};

export const yconsole = {
    log: (tcode: string, ...args: any[]) => {
        console.log(tcode, " INFO  ", moment().format(isoDateFormat), " - ", ...args);
    },

    warn: (tcode: string, ...args: any[]) => {
        console.warn(tcode, " WARN  ", moment().format(isoDateFormat), " - ", ...args);
    },

    error: (tcode: string, ...args: any[]) => {
        console.error(tcode, " ERROR ", moment().format(isoDateFormat), " - ", ...args);
    },

    fatal: (tcode: string, ...args: any[]) => {
        console.trace(tcode, " FATAL ", moment().format(isoDateFormat), " - ", ...args);
    }
};
