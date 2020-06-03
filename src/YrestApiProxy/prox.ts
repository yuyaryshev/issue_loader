import http from "http";
import https from "https";
import { URL, URLSearchParams } from "url";
// @ts-ignore
import flatstr from "flatstr";

export interface ResponseData {
    body?: string | object;
    headers?: any;
    statusCode?: number;
}

export interface RequestPartialData {
    data?: string;
    query?: any;
    headers?: object;
    parseJson?: boolean;
}

export interface RequestData extends RequestPartialData {
    method: HttpRequestMethod;
    url?: string;
}

export interface RestProxyOptions {
    host: string;
    port?: number;
    headers?: any;
    parseJson?: boolean;
}

export type HttpRequestMethod = "GET" | "POST" | "PUT" | "DELETE";

export type RestProxyRequest = (
    method: HttpRequestMethod | RequestData,
    url?: string,
    options?: RequestPartialData
) => Promise<ResponseData>;

export const restProxy = (options: RestProxyOptions): RestProxyRequest => {
    // Gather variables
    let { host, headers, parseJson } = options;
    if (!headers) headers = {};

    // Create instance of http or https and verify host
    const isSecure = host.startsWith("https://");
    if (!isSecure && !host.startsWith("http://")) throw new Error("INVALID_HOST");
    let client: typeof import("http") | typeof import("https") = http;
    if (isSecure) client = https;

    // Get Port
    const port = options.port || (isSecure ? 443 : 80);

    // Return an axios style instance that accepts a
    // path, additional headers, body, method, and query params
    return (
        method: HttpRequestMethod | RequestData,
        path: string = "/",
        options: RequestPartialData = { parseJson: false }
    ): Promise<ResponseData> => {
        if (typeof method === "object") {
            const { url, method: method2, ...options2 } = method;
            options = options2 || { parseJson: false };
            path = url || "/";
            method = method2;
        }
        // Gather variables
        const { headers: additionalHeaders, query, data } = options;
        const requestMethod: HttpRequestMethod = (method.trim().toUpperCase() as any) as HttpRequestMethod;

        // Parse out the passed host
        const url = new URL(host.trim());

        // Add in query params
        url.search = new URLSearchParams(query).toString();

        // Check if method would have data.
        const hasData = requestMethod !== "GET" && requestMethod !== "DELETE";

        // Build data
        let dataToSend: string = data || "";
        if (hasData) {
            if (data === Object(data)) {
                try {
                    dataToSend = JSON.stringify(data);
                } catch (err) {
                    dataToSend = data || "";
                }
            }
        }

        // Build options
        const requestOptions = {
            hostname: url.hostname,
            port: url.port || port,
            headers: {
                ...additionalHeaders,
                host: url.hostname + (port === 80 ? ":" + port : ""),
                ...headers,
            },
            method: requestMethod,
            path: path.trim(),
        };

        if (hasData) {
            requestOptions.headers["Content-Length"] = dataToSend.length;
        }

        // Request
        return new Promise((resolve, reject) => {
            const request = client.request(requestOptions, response => {
                let responseBody = "";

                response.on("data", body => {
                    responseBody += body;
                });

                response.on("end", () => {
                    responseBody = flatstr(responseBody);
                    if (parseJson) {
                        responseBody = JSON.parse(responseBody);
                    }

                    delete response.headers["transfer-encoding"];
                    resolve({
                        body: responseBody,
                        headers: response.headers,
                        statusCode: response.statusCode,
                    });
                });
            });

            request.on("error", error => {
                reject(error);
            });

            if (hasData) {
                request.write(data);
            }
            request.end();
        });
    };
};
