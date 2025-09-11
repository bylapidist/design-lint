export const FILE_TYPE_MAP: Record<string, string> = {
  ts: 'ts',
  tsx: 'ts',
  mts: 'ts',
  cts: 'ts',
  js: 'ts',
  jsx: 'ts',
  mjs: 'ts',
  cjs: 'ts',
  css: 'css',
  scss: 'css',
  sass: 'css',
  less: 'css',
  vue: 'vue',
  svelte: 'svelte',
};

export const defaultPatterns = [
  '**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,css,scss,sass,less,svelte,vue}',
];
