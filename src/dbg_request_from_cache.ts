import { resolve } from "path";
import { cachedRequests } from './mockableRequest';
export const unused345: any = 4;
import {writeFileSync} from 'fs';
import { startEnv } from "./startEnv";

const testFunc = async ()=> {   
    const extractedRequestPath = resolve("extractedRequest.json");

    try {
        console.log("Starting...");
        console.log(`extractedRequestPath = ${extractedRequestPath}`);
        const env = await startEnv("test", {noJiraTest: true, noDbTest: true});

        console.log(`---------------------------------------------------------`);
        for(let [k, v] of cachedRequests) {
            const stringified = JSON.stringify([k,v], undefined, "    ");
            if(k.includes("getAllFields")) {
                console.log(k);
                writeFileSync(extractedRequestPath, stringified, "utf-8");
            }
            continue;

            console.log(k);
            console.log([k, v]);
            console.log(stringified);
        }
        console.log(`---------------------------------------------------------`);

        console.log("Finished - OK");
    } catch(e) {
        console.error("ERROR", e);
    }
};


testFunc();