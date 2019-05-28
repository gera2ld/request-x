const { isProd } = require('@gera2ld/plaid/util');

/**
 * For each entry, `key` is the chunk name, `value` has following properties:
 * - value.entry: webpack entry.
 * - value.html: options object passed to HtmlWebpackPlugin.
 * - value.html.inlineSource: if true, JS and CSS files will be inlined in HTML.
 */
exports.pages = {
  blocker: {
    entry: './src/blocker',
  },
  'options/index': {
    entry: './src/options/index',
    html: {
      title: 'Request Blocker',
    },
  },
  'popup/index': {
    entry: './src/popup/index',
    html: {
      title: 'Request Blocker',
    },
  },
};

exports.global = {
  devServer: false,
  devtool: isProd ? false : 'inline-source-map',
};