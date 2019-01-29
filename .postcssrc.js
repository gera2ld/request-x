const { combineConfigSync } = require('@gera2ld/plaid/util/helpers');
const precss = require('@gera2ld/plaid/postcss/precss');

module.exports = combineConfigSync({}, [precss]);