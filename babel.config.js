module.exports = {
  extends: require.resolve('@gera2ld/plaid/config/babelrc'),
  presets: [
    ['@babel/preset-typescript', {
      allExtensions: true,
    }],
  ],
  plugins: [
  ]
};
