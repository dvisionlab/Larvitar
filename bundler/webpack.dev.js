const path = require("path");
const { merge } = require("webpack-merge");
const commonConfiguration = require("./webpack.common.js");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = merge(commonConfiguration, {
  entry: path.resolve(__dirname, "../index.ts"),
  output: {
    path: path.resolve(__dirname, "../dist"),
    filename: "larvitar.js",
    library: "larvitar",
    libraryTarget: "umd"
  },
  mode: "development",
  plugins: [new CleanWebpackPlugin()],
  watch: true,
  watchOptions: {
    ignored: /node_modules/
  }
});
