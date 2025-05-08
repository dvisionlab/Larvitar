module.exports = {
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
      },
      // webAssembly support
      {
        test: /\.wasm$/,
        type: "asset/resource"
      }
    ]
  },
  experiments: {
    asyncWebAssembly: true
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".d.ts", ".wasm"],
    fallback: {
      fs: false,
      path: false,
      crypto: false
    }
  }
};
