import { unlinkSync } from "fs";

export const deleteFileIfExists = (fileName: string) => {
    try {
        unlinkSync(fileName);
    } catch (e) {}
};
