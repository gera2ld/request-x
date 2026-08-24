import UnoCSS from '@unocss/postcss';
import postcssNesting from 'postcss-nesting';

export default {
  plugins: [postcssNesting(), UnoCSS()],
};
