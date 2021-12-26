const { isProd } = require('@gera2ld/plaid/util');

/**
 * For each entry, `key` is the chunk name, `value` has following properties:
 * - value.entry: webpack entry.
 * - value.html: options object passed to HtmlWebpackPlugin.
 * - value.html.inlineSource: if true, JS and CSS files will be inlined in HTML.
 */
const htmlFactory = extra => options => ({
  ...options,
  title: 'Request X',
  ...extra,
  chunks: ['browser', ...options.chunks],
});
exports.pages = {
  browser: {
    entry: './src/common/browser',
  },
  handler: {
    entry: {
      import: './src/handler',
      dependOn: 'browser',
    },
  },
  'options/index': {
    entry: {
      import: './src/options/index',
      dependOn: 'browser',
    },
    html: htmlFactory(),
  },
  'popup/index': {
    entry: {
      import: './src/popup/index',
      dependOn: 'browser',
    },
    html: htmlFactory(),
  },
};

exports.global = {
  devServer: false,
  devtool: isProd ? false : 'inline-source-map',
};
