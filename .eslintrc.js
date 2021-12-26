module.exports = {
  root: true,
  extends: [
    require.resolve('@gera2ld/plaid/eslint'),
    require.resolve('@gera2ld/plaid-common-vue/eslint/vue3-ts'),
  ],
  parserOptions: {
    project: './tsconfig.json',
    ecmaFeatures: {
      legacyDecorators: true,
    },
  },
};
