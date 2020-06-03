const fs = require("fs-extra");
const path = require("path");
const glob = require("glob");

const readDirRecursive = (pth, callback) => {
    let files = fs.readdirSync(pth, { withFileTypes: true });
    for (let filename of files) {
        let r = callback(pth, filename);
        if (r !== false && filename.isDirectory()) readDirRecursive(path.join(pth, filename.name), callback);
    }
};

const globs = ["*.js", "src/**/*.ts", "src/**/*.js", "src/**/*.tsx", "src/**/*.jsx"];

const files = [];

for (let globItem of globs) files.push(...glob.sync(globItem));

const absFiles = files.map(f => path.resolve(f));

for (let filename of absFiles) {
    // TODO поискать в файле вхождение названий пакетов из package.json
    fs.readFileSync(filename, "utf-8");
}

// TODO не доделал, npm-check в итоге отработал ....

console.log(`\n\n\n\n`);
for (let filename of absFiles) {
    console.log(filename);
}
