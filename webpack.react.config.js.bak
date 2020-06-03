// Based on:
// Based on:
// https://github.com/gaearon/react-hot-loader
// https://github.com/gaearon/react-hot-loader/blob/master/examples/typescript/webpack.config.babel.js

const hot = false; // Enables hot reloading
const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin").CleanWebpackPlugin;
const outputPath = path.resolve(__dirname, "public");

const NODE_ENV = "development";

let BUILD_DATE = new Date();
BUILD_DATE.setTime(BUILD_DATE.getTime() + 3 * 60 * 60 * 1000);
BUILD_DATE = JSON.stringify(BUILD_DATE);
BUILD_DATE = BUILD_DATE.substr(1, 10) + " " + BUILD_DATE.substr(12, 8);

console.log("");
console.log("BUILD_DATE = " + BUILD_DATE);
console.log("outputPath = " + outputPath);
console.log("");

let package_json;
let manifest_json;

let moduleAliases = {};
package_json = JSON.parse(fs.readFileSync(path.resolve(__dirname, "package.json"), { encoding: "utf-8" }));
try {
    manifest_json = JSON.parse(fs.readFileSync(path.resolve(__dirname, "dist/manifest.json"), { encoding: "utf-8" }));
} catch (e) {}
let tsconf = {};
try {
    tsconf = eval("(()=>(" + fs.readFileSync("tsconfig.json", "utf-8") + "))()");
    for (let k in tsconf.compilerOptions.paths) {
        let v = tsconf.compilerOptions.paths[k];
        moduleAliases[k] = path.resolve("./" + v[0]);
    }
} catch (e) {}

let excludedModules = ["fs", "sql-prettier", "prettier", "express", "socket.io"];

module.exports = Object.assign(
    {},
    hot
        ? {
              devServer: {
                  contentBase: "./dist",
                  hot: true,
              },
          }
        : {},
    {
        node: {
            fs: "empty",
            //        console: 'empty',
            net: "empty",
            tls: "empty",
        },
        mode: "development",
        entry: ["./src/monitoring_ui/index.jsx"],
        devtool: "inline-source-map",
        resolve: {
            //        root:               path.join(__dirname, 'js'),
            //        modulesDirectories: ['node_modules'],
            extensions: [".ts", ".tsx", ".js", ".jsx"],
            alias: {
                //            'react-dom': '@hot-loader/react-dom',
                ...moduleAliases,
            },
        },
        output: {
            path: outputPath,
            filename: "bundle.js",
        },
        module: {
            rules: [
                {
                    test: modulePath0 => {
                        let modulePath = modulePath0.split(path.sep);
                        for (let excludedModule of excludedModules)
                            if (modulePath.includes(excludedModule)) return true;
                        return false;
                    },
                    use: "null-loader",
                },
                // {
                // test: /\.scss$/,
                // use: [
                //     "style-loader", // creates style nodes from JS strings
                //     "css-loader", // translates CSS into CommonJS
                //     "sass-loader" // compiles Sass to CSS, using Node Sass by default
                // ]
                // },
                {
                    test: /\.(j|t)sx?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: "babel-loader",
                        options: {
                            cacheDirectory: true,
                            babelrc: false,
                            presets: [
                                // [
                                //     "@babel/preset-env",
                                //     { targets: { browsers: "last 2 versions" } } // or whatever your project requires
                                // ],
                                "@babel/preset-typescript",
                                "@babel/preset-react",
                            ],
                            plugins: [
                                // plugin-proposal-decorators is only needed if you're using experimental decorators in TypeScript
                                ["@babel/plugin-proposal-decorators", { legacy: true }],
                                ["@babel/plugin-proposal-class-properties", { loose: true }],
                                "@babel/plugin-proposal-optional-chaining",
                                //                            "react-hot-loader/babel"
                            ],
                        },
                    },
                },
            ],
        },
        plugins: [
            new webpack.DefinePlugin({
                BROWSER: "true",
                "process.env.BROWSER": "true",
                "process.env.hot": JSON.stringify(hot),
                NODE_ENV: JSON.stringify(NODE_ENV),
                BUILD_DATE: JSON.stringify(BUILD_DATE),
            }),
            new CleanWebpackPlugin(),
            new webpack.NamedModulesPlugin(),
            new HtmlWebpackPlugin({ title: manifest_json ? manifest_json.name : package_json.name }),
            //        new webpack.HotModuleReplacementPlugin(),
        ],
        //	watchOptions : {
        //		aggregateTimeout : 300
        //	},
    }
);

require("./inc_version.js");
