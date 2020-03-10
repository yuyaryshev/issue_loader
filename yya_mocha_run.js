const fs = require("fs");
const path = require("path");
const Mocha = require("mocha");
const { Runner } = require("mocha");
const mocha = new Mocha({
    extension: ["js"],
    spec: "cov_out/**/*.test.js",
    require: "source-map-support/register",
    //	"require": "test/babel-register.js",
});
mocha.reporter("xunit");

const readDirRecursive = (pth, callback) => {
    let files = fs.readdirSync(pth, { withFileTypes: true });
    for (let filename of files) {
        let r = callback(pth, filename);
        if (r !== false && filename.isDirectory()) readDirRecursive(path.join(pth, filename.name), callback);
    }
};

readDirRecursive("./cov_out/src", (pth, f) => {
    if ((f && f.name && f.name.endsWith(".test.js")) || f.name.endsWith(".tst.ts")) {
        mocha.addFile(path.join(pth, f.name));
    }
});

mocha.run();
//console.log("mocha", mocha);
