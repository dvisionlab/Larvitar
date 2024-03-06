module.exports = {
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.(html)$/,
        use: ["html-loader"]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ["babel-loader"]
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      },
      {
        test: /\.worker\.js$/,
        use: {
          loader: "worker-loader",
          options: { filename: "[name].[hash].js" }
        }
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".d.ts"]
  }
};
