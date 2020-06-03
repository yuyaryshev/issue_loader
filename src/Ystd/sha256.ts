import crypto from "crypto";

export const sha256hex = (...args: any[]): string => {
    return crypto
        .createHash("sha256")
        .update(args.join(""))
        .digest("hex");
};

export const sha256base64 = (...args: any[]): string => {
    const r = crypto
        .createHash("sha256")
        .update(args.join(""))
        .digest("base64");
    return r.substr(0, r.length - 1); // remove trailing '=' char
};

export const shortSelfOrsha256base64 = (s: string, maxLen: number = 50): string => {
    if (s.length < maxLen) return s;
    const r = crypto
        .createHash("sha256")
        .update(s)
        .digest("base64");
    return r.substr(0, r.length - 1); // remove trailing '=' char
};
