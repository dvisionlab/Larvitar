import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import pkg from "./package.json";

export default [
  // browser-friendly UMD build
  {
    input: "index.js",
    output: {
      name: "larvitar",
      file: pkg.browser,
      format: "umd",
      globals: {
        fs: "fs",
        path: "path"
      }
    },
    plugins: [
      resolve({
        jsnext: true,
        main: true,
        browser: true,
        extensions: [".js", ".json"],
        preferBuiltins: true
      }), // so Rollup can find node_modules
      commonjs(), // so Rollup can convert node_modules to an ES module,
      json()
    ]
  }

  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // an array for the `output` option, where we can specify
  // `file` and `format` for each target)
  // {
  //   input: "index.js",
  //   external: ["cornerstone-core"],
  //   output: [
  //     { file: pkg.common, format: "cjs" },
  //     { file: pkg.module, format: "es" }
  //   ]
  // }
];
