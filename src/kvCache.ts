import { EnvSettings, CacheSettings } from "./startEnv";
import levelup, { LevelUp } from "levelup";
import leveldown from "leveldown";
import moment from "moment";

// @ts-ignore
const cleanDeep = require("clean-deep");

// @ts-ignore
const decodeUtf8Buffer = require("arraybuffer-to-string");

export interface KVCache {
    settings: CacheSettings;
    minutesToLive: number;
    cacheDb: LevelUp | undefined;
}

export async function KVCacheInit(settings: CacheSettings): Promise<KVCache> {
    if (!settings.enabled) return { settings, cacheDb: undefined, minutesToLive: settings.minutesToLive || 0 };
    return { settings, minutesToLive: settings.minutesToLive || 0, cacheDb: await levelup(leveldown(settings.file)) };
}

export async function KVCacheSet(kvCache: KVCache, k: string, v: any | undefined): Promise<void> {
    if (kvCache.cacheDb) {
        const v2 = cleanDeep(v, {
            cleanValues: [],
            emptyArrays: false,
            emptyObjects: false,
            emptyStrings: false,
            nullValues: true,
            undefinedValues: true
        });
        return kvCache.cacheDb.put(k, JSON.stringify({ v: v2, cacheTs: moment().format() }, undefined, "    "));
    }
}

export async function KVCacheGet(kvCache: KVCache, k: string): Promise<string | undefined> {
    if (!kvCache.cacheDb) return undefined;

    let c;
    try {
        c = JSON.parse(await kvCache.cacheDb.get(k));
    } catch (e) {}

    let found = !!c;
    if (found && kvCache.minutesToLive > 0) {
        const diff = moment().diff(moment(c.cacheTs), 'm');
        if (diff > kvCache.minutesToLive) found = false;
    }

    if (found) return c.v;

    return undefined;
}

type CBR<T> = T extends (...args: any[]) => Promise<infer R> ? R : (T extends (...args: any[]) => infer R ? R : any);

export async function KVCacheUpsert<T>(kvCache: KVCache, k: string, callback: () => CBR<T>): Promise<CBR<T>> {
    if (!kvCache.cacheDb) return callback();
    let c;
    try {
        c = JSON.parse(await kvCache.cacheDb.get(k));
    } catch (e) {}

    let found = !!c;
    if (found && kvCache.minutesToLive > 0) {
        const diff = moment().diff(moment(c.cacheTs), 'm');
        if (diff > kvCache.minutesToLive) found = false;
    }

    if (found) return c.v;
    const v = await callback();
    KVCacheSet(kvCache, k, v);
    return v;
}

export interface KVCacheRecord<T> {
    k: string;
    v: {
        cacheTs: string;
        v: T;
    }
}

export type KVBatchCallback<T> = (kv: KVCacheRecord<T>[]) => void | Promise<void>;

export async function KVCacheGetAll<T>(kvCache: KVCache, callback: KVBatchCallback<T>) {
    if (!kvCache.cacheDb) throw new Error(`ERROR: IssueCache is disabled in settings `);

    let bulk: any[] = [];
    let promises: any[] = [];
    return new Promise(function(resolve, reject) {
        kvCache
            .cacheDb!.createValueStream()
            .on("data", async function(data) {
                const decoded = decodeUtf8Buffer(data); //(new TextDecoder("utf-8")).decode(data);
                const parsed = JSON.parse(decoded);
                bulk.push(parsed);
                if (bulk.length >= 1000) {
                    promises.push(callback(bulk));
                    bulk = [];
                }
            })
            .on("error", async function(err) {
                if (bulk.length) {promises.push(callback(bulk)); bulk = [];}
                await Promise.all(promises);
                reject(err);
            })
            .on("close", async function() {
                if (bulk.length) {promises.push(callback(bulk)); bulk = [];}
                await Promise.all(promises);
                resolve();
            })
            .on("end", async function() {
                if (bulk.length) {promises.push(callback(bulk)); bulk = [];}
                await Promise.all(promises);
                resolve();
            });
    });
}
