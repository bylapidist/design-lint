declare module 'postcss-less' {
  import type { Parser } from 'postcss';
  const less: { parse: Parser };
  export default less;
}
