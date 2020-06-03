import { makeApiProxy, ProxySettings } from "YrestApiProxy";
import exitHook from "exit-hook";
import { resolve } from "path";

const proxySettings: ProxySettings = {
    port: 4000,
    items: [
        {
            name: "jira",
            offlineMode: true, //false,
            virtualDir: false,
            protocol: "http",
            port: 80,
            host: "jira.moscow.alfaintra.net",
            headers: {
                // "X-Auth-Token": "XXXXXXX",
            },
            strictSSL: false,
            requests: new Map(),
        },
    ],
};

export function jiraProxy() {
    for (let proxyItem of proxySettings.items) {
        const filename = resolve(`./proxyData-${proxyItem.name}.js`);
        try {
            proxyItem.requests = new Map();
            const requests = require(filename).requests;
            for (let k in requests) proxyItem.requests.set(k, requests[k]);
        } catch (e) {
            console.error(`CODE00000058`, `Couldn't load file ${filename}`);
        }
    }
    makeApiProxy(proxySettings);
}

exitHook(() => {
    for (let proxyItem of proxySettings.items) {
        if (proxyItem.save) {
            const filename = resolve(`./proxyData-${proxyItem.name}.js`);
            console.log(`Saving request-response to ${filename}...`);
            proxyItem.save(filename);
        }
    }
    console.log("Exiting...");
});
