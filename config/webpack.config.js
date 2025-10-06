const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  const config = {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'inline-source-map'
  };

  return merge(common, config);
};