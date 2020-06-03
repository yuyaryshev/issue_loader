const fs = require("fs");
const path = require("path");
const { stringify } = require("javascript-stringify");
const name = path
    .resolve(".")
    .split(path.sep)
    .pop();

const settings = JSON.parse(fs.readFileSync(`settings.json`, "utf-8"));

module.exports = {
    apps: [
        {
            name,
            script: "./ts_out/src/start.js",
            node_args: [...(settings.debugPort ? [`--inspect=0.0.0.0:${settings.debugPort}`] : [])],
            env: {
                NODE_ENV: "development",
            },
            env_production: {
                NODE_ENV: "production",
            },
        },
    ],
};

console.log(`pm2 - ecosystem.config.js loaded! name='${name}'\n`, stringify(module.exports, undefined, "    "));
