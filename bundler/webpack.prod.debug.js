const path = require("path");
const { merge } = require("webpack-merge");
const commonConfiguration = require("./webpack.common.js");
const LodashModuleReplacementPlugin = require("lodash-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = merge(commonConfiguration, {
  devtool: false,
  entry: path.resolve(__dirname, "../index.ts"),
  output: {
    path: path.resolve(__dirname, "../dist"),
    filename: "larvitar.js",
    library: "larvitar",
    libraryTarget: "umd",
    clean: true
  },
  mode: "production",
  plugins: [new CleanWebpackPlugin(), new LodashModuleReplacementPlugin()],
  optimization: {
    minimize: false, // Disable minification for easier debugging
    usedExports: false // Disable tree shaking
  }
});
