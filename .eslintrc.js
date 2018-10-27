module.exports = {
  extends: [
    require.resolve('webpack-util/eslint'),
    require.resolve('webpack-util-vue/eslint/vue'),
  ],
  rules: {
  },
  globals: {
    browser: true,
  },
};
