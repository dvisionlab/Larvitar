module.exports = {
  devtool: "source-map", // or inline-source-map ?
  module: {
    rules: [
      // HTML
      {
        test: /\.(html)$/,
        use: ["html-loader"]
      },
      // JS
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ["babel-loader"]
      },
      // typescript support
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".d.ts"],
    fallback: {
      fs: false,
      path: false,
      crypto: false
    }
  }
};
