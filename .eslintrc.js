module.exports = {
  extends: [
    require.resolve('@gera2ld/plaid/eslint'),
    require.resolve('@gera2ld/plaid-vue/eslint/vue'),
  ],
  rules: {
  },
  globals: {
    browser: true,
  },
};
