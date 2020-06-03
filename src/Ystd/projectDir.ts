// @ts-ignore
import rootPath from "app-root-path";
import { join, resolve } from "path";
import { existsSync } from "fs";

export const projectDir = rootPath.toString();
export const projectDirResolve = (suffix: string) => {
    return resolve(join(projectDir, suffix));
};

export let workDirRoot = (() => {
    try {
        let r: string = resolve(__dirname || resolve("."));
        while (!existsSync(resolve(r, "package.json"))) r = resolve(join(r, ".."));
        return r;
    } catch (e) {
        return "CODE00000287_unknown";
    }
})();
