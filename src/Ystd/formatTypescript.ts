let formatjs: any = undefined;

// @ts-ignore
try {
    formatjs = require("prettier");
} catch (e) {}

let format = formatjs ? formatjs.format : undefined;

export const formatTypescript = (typescriptSourceCode: string): string => {
    if (!format) return typescriptSourceCode;
    try {
        return format(typescriptSourceCode, {
            semi: true,
            parser: "typescript",
            tabWidth: 4,
            printWidth: 150,
            trailingComma: "all",
        });
    } catch (e) {
        return typescriptSourceCode;
    }
};

// export const formatTypescript = (s: string): string => s;
