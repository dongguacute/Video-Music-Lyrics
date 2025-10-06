const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const SizePlugin = require('size-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  const config = {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'inline-source-map'
  };

  if (isProduction) {
    config.plugins = [
      new SizePlugin()
    ];
  }

  return merge(common, config);
};