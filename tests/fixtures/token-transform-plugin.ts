import type { PluginModule, DesignTokens, TokenGroup } from '../../src/core/types.ts';
import { registerTokenTransform } from '../../src/core/index.ts';

const plugin: PluginModule = {
  rules: [],
  init() {
    registerTokenTransform((tokens: DesignTokens) => {
      const { color, ...rest } = tokens;
      const colors = (typeof color === 'object' && color !== null ? color : {}) as TokenGroup;
      return {
        ...rest,
        color: {
          ...colors,
          blue: { $type: 'color', $value: '#00f' },
        },
      };
    });
  },
};

export default plugin;
