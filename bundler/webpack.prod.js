const path = require("path");
const { merge } = require("webpack-merge");
const commonConfiguration = require("./webpack.common.js");
const LodashModuleReplacementPlugin = require("lodash-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = merge(commonConfiguration, {
  entry: path.resolve(__dirname, "../index.ts"),
  output: {
    path: path.resolve(__dirname, "../dist"),
    filename: "larvitar.js",
    library: "larvitar",
    libraryTarget: "umd"
  },
  mode: "production",
  plugins: [new CleanWebpackPlugin(), new LodashModuleReplacementPlugin()],
  optimization: {
    minimize: true
  }
});
