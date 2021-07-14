const path = require("path");
module.exports = [
  {
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    devtool: 'source-map',
    target: 'web',
    output: {
      path: path.resolve('./test'),
      filename: 'server.js',
    },
    name: 'server',
    entry: './test/src/server.ts',
    mode: 'development',
  },
  {
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    devtool: 'source-map',
    target: 'web',
    output: {
      path: path.resolve('./test'),
      filename: 'client.js',
    },
    name: 'client',
    entry: './test/src/client.ts',
    mode: 'development',
  },
];
