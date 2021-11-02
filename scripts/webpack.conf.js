const { modifyWebpackConfig } = require('@gera2ld/plaid');
const webpack = require('webpack');

module.exports = modifyWebpackConfig(async (config) => {
  config.output.publicPath = '/';
  config.optimization = {
    ...config.optimization,
    runtimeChunk: false,
    splitChunks: {
      cacheGroups: {
        common: {
          name: 'common',
          minChunks: 2,
          chunks(chunk) {
            return ![
              'browser',
              'handler',
            ].includes(chunk.name);
          },
        },
      },
    },
  };
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.DEBUG': JSON.stringify(process.env.DEBUG || false),
    }),
  );
  return config;
});
