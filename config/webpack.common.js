const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const PATHS = require('./paths');

module.exports = {
  entry: {
    popup: PATHS.src + '/popup/popup.js',
    content: PATHS.src + '/content/content.js',
    background: PATHS.src + '/background/background.js',
    lyrics: PATHS.src + '/lyrics/lyrics.js'
  },
  output: {
    path: PATHS.build,
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'icons/[name][ext]'
        }
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new CopyPlugin({
      patterns: [
        {
          from: PATHS.public + '/manifest.json',
          to: PATHS.build
        },
        {
          from: PATHS.public + '/popup.html',
          to: PATHS.build
        },
        {
          from: PATHS.public + '/lyrics.html',
          to: PATHS.build
        },
        {
          from: PATHS.public + '/icons',
          to: PATHS.build + '/icons'
        }
      ]
    })
  ],
  resolve: {
    extensions: ['.js', '.css']
  }
};