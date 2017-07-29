const webpack = require('webpack');
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BabiliPlugin = require('babili-webpack-plugin');
const base = require('./webpack.base.conf');
const { IS_DEV, merge } = require('./utils');

const targets = [];
module.exports = targets;

targets.push(merge(base, {
  entry: {
    'options/app': 'src/options/index.js',
    blocker: 'src/blocker.js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'options/index.html',
      template: 'src/public/index.html',
      chunks: ['options/app'],
    }),
    // new FriendlyErrorsPlugin(),
    !IS_DEV && new ExtractTextPlugin('[name].css'),
  ].filter(Boolean),
}));
