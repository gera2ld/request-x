const webpackConfig = require('webpack-util/config/webpack.conf');
const webpackUtil = require('webpack-util/webpack');
const { defaultOptions, parseConfig, combineConfig, isProd } = require('webpack-util/util');

defaultOptions.devServer = false;

module.exports = async () => {
  const config = await combineConfig(parseConfig(webpackConfig), [
  ], {
    ...defaultOptions,
  });
  config.devtool = isProd ? false : 'inline-source-map';
  config.optimization = {
    splitChunks: {
      cacheGroups: {
        browser: {
          name: 'browser',
          minChunks: 3,
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: chunk => /^(options|popup)\//.test(chunk.name),
        },
      },
    },
  };
  return config;
};
