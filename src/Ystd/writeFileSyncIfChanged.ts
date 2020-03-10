import { readFileSync, writeFileSync } from "fs";

export const writeFileSyncIfChanged = (fileName: string, content: string) => {
    let current: string | undefined;
    try {
        current = readFileSync(fileName, "utf-8");
    } catch (e) {}

    if (current !== content) {
        writeFileSync(fileName, content, "utf-8");
        return true;
    }
    return false;
};
