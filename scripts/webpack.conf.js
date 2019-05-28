const { modifyWebpackConfig } = require('@gera2ld/plaid');

module.exports = modifyWebpackConfig(async (config) => {
  config.optimization = {
    ...config.optimization,
    runtimeChunk: false,
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
});
