import { KVCache, KVCacheUpsert } from './kvCache';
import { readFileSync, writeFileSync } from "fs";
import { EnvSettings } from "./startEnv";

const cleanDeep = require("clean-deep");

type CBR<T> = T extends (...args: any[]) => Promise<infer R> ? R : (T extends (...args: any[]) => infer R ? R : any);

let loaded = false;
export const cachedRequests = new Map<string, any>();
export function mockableRequest<T>(settings: EnvSettings, key: string, callback: () => CBR<T>): any {
    return undefined as any;
}

export function loadCachedRequests(settings: EnvSettings) {
}

export function saveCachedRequests(settings: EnvSettings) {
}
