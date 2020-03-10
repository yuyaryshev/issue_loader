require("rimraf").sync("coverage");

module.exports = {
    nyc: {
        sourceMap: true,
        instrument: true,
        all: true,
        include: [
            "*",
            //      "src/**/*.js",
        ],
        exclude: ["node_modules", "public", "**/bundle.js"],
    },
};
