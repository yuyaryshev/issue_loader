import express from "express";
import { RequestData, ResponseData, restProxy } from "./prox";
import { stringify as jsStringify } from "javascript-stringify";
import { shortSelfOrsha256base64, writeFileSyncIfChanged } from "Ystd";

export interface RequestResponseData {
    request: RequestData;
    response: ResponseData;
}

export function keyForRequest(requestData: RequestData) {
    const { method, url, ...other } = requestData;
    return requestData.method + " " + requestData.url + " " + shortSelfOrsha256base64(JSON.stringify(other));
}

export interface ProxyItem {
    name: string;
    protocol: "http";
    port: number;
    host: string;
    headers?: any;
    strictSSL: boolean;
    virtualDir?: boolean;
    requests?: Map<string, RequestResponseData>;
    offlineMode: boolean;
    save?: (filename: string) => void;
}

export interface ProxySettings {
    port: number;
    items: ProxyItem[];
}

const proxySettingsExample: ProxySettings = {
    port: 4000,
    items: [
        {
            name: "jira",
            offlineMode: false,
            virtualDir: false,
            protocol: "http",
            port: 80,
            host: "jira.moscow.alfaintra.net",
            headers: {
                "X-Auth-Token": "XXXXXXX",
                // username: "LOGIN",
                // password: "PASS",
            },
            strictSSL: false,
            requests: new Map(),
        },
    ],
};

//---------------------------------------------

export function makeApiProxy(proxySettings: ProxySettings) {
    const app = express();

    for (let proxyItem of proxySettings.items) {
        if (!proxyItem.requests) proxyItem.requests = new Map();
        const prefix = proxyItem.virtualDir ? `/proxies/${proxyItem.name}/` : "/";
        const hostPort = proxyItem.host + ":" + (proxyItem.port || 80);
        const proxy = restProxy({
            host: proxyItem.protocol + "://" + hostPort,
            headers: proxyItem.headers,
        });

        proxyItem.save = function save(filename: string) {
            const r = {} as any;
            for (let [key, requestResponse] of proxyItem.requests!) {
                r[key] = requestResponse;
            }
            const s = "module.exports = { requests: \n" + (jsStringify(r, undefined, "    ") || "{}") + "\n}";
            writeFileSyncIfChanged(filename, s);
        };

        app.all(prefix + "*", async (req: any, res: any) => {
            const request = {
                method: req.method,
                url: req.url.substr(prefix.length - 1),
                query: req.query,
                data: req.body || undefined,
                headers: req.headers,
            };
            const requestKey = keyForRequest(request);
            const requestResponse = proxyItem.requests!.get(requestKey);
            if (requestResponse) {
                res.status(requestResponse.response.statusCode)
                    .set(requestResponse.response.headers)
                    .send(requestResponse.response.body);
            } else {
                if (proxyItem.offlineMode) {
                    res.status(404).send("Proxy is in Offline mode and does not have this request.");
                    return;
                }

                const response = await proxy(request);
                proxyItem.requests!.set(requestKey, { request, response });
                res.status(response.statusCode)
                    .set(response.headers)
                    .send(response.body);
            }
        });
    }

    app.listen(proxySettings.port, () => {
        console.log(`Rest API proxy server running on port ${proxySettings.port}...`);
        for (let proxyItem of proxySettings.items)
            console.log(
                `   Endpoint /proxies/${proxyItem.name} for ${(proxyItem.protocol || "http") +
                    "://" +
                    proxyItem.host +
                    (proxyItem.port ? ":" + proxyItem.port : "")} ${proxyItem.offlineMode ? " - OFFLINE MODE" : ""}...`
            );
    });
}

// makeApiProxy(proxySettingsExample);
