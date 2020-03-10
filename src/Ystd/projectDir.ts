// @ts-ignore
import rootPath from "app-root-path";
import { resolve, join } from "path";
import { existsSync } from "fs";

export const projectDir = rootPath.toString();
export const projectDirResolve = (suffix: string) => {
    return resolve(join(projectDir, suffix));
};

export let workDirRoot = (() => {
    let r: string = resolve(__dirname || resolve("."));
    while (!existsSync(resolve(r, "package.json"))) r = resolve(join(r, ".."));
    return r;
})();
