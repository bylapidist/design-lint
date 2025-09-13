import { parse } from 'culori';
import { isObject } from '../../utils/guards/index.js';

/** Mapping of Design Tokens color space identifiers to culori mode names and
 * their expected component keys. */
export const COLOR_SPACE_CONFIG: Record<
  string,
  { mode: string; components: Record<string, string> }
> = {
  srgb: { mode: 'srgb', components: { red: 'r', green: 'g', blue: 'b' } },
  'srgb-linear': {
    mode: 'srgb-linear',
    components: { red: 'r', green: 'g', blue: 'b' },
  },
  'display-p3': { mode: 'p3', components: { red: 'r', green: 'g', blue: 'b' } },
  'a98-rgb': { mode: 'a98', components: { red: 'r', green: 'g', blue: 'b' } },
  'prophoto-rgb': {
    mode: 'prophoto',
    components: { red: 'r', green: 'g', blue: 'b' },
  },
  rec2020: { mode: 'rec2020', components: { red: 'r', green: 'g', blue: 'b' } },
  lab: { mode: 'lab', components: { l: 'l', a: 'a', b: 'b' } },
  lch: { mode: 'lch', components: { l: 'l', c: 'c', h: 'h' } },
  oklab: { mode: 'oklab', components: { l: 'l', a: 'a', b: 'b' } },
  oklch: { mode: 'oklch', components: { l: 'l', c: 'c', h: 'h' } },
  'xyz-d50': { mode: 'xyz50', components: { x: 'x', y: 'y', z: 'z' } },
  'xyz-d65': { mode: 'xyz65', components: { x: 'x', y: 'y', z: 'z' } },
};

export interface ColorValue {
  colorSpace: keyof typeof COLOR_SPACE_CONFIG;
  components: Record<string, number>;
  alpha?: number;
  hex?: string;
}

export function validateColor(
  value: unknown,
  path: string,
): asserts value is ColorValue | string {
  if (typeof value === 'string') {
    const parsed = parse(value);
    if (parsed && (parsed.mode === 'rgb' || parsed.mode === 'hsl')) return;
    throw new Error(`Token ${path} has invalid color value`);
  }
  if (!isObject(value)) {
    throw new Error(`Token ${path} has invalid color value`);
  }
  const colorSpace = value.colorSpace;
  if (typeof colorSpace !== 'string') {
    throw new Error(`Token ${path} has invalid color value`);
  }
  const components = value.components;
  const alpha = value.alpha;
  const hex = value.hex;
  const cfg = COLOR_SPACE_CONFIG[colorSpace];
  if (!isObject(components)) {
    throw new Error(`Token ${path} has invalid color value`);
  }
  const specKeys = Object.keys(cfg.components);
  const compKeys = Object.keys(components);
  if (
    compKeys.length !== specKeys.length ||
    !specKeys.every((k) => typeof components[k] === 'number')
  ) {
    throw new Error(`Token ${path} has invalid color value`);
  }
  if (alpha !== undefined && typeof alpha !== 'number') {
    throw new Error(`Token ${path} has invalid color value`);
  }
  if (hex !== undefined && typeof hex !== 'string') {
    throw new Error(`Token ${path} has invalid color value`);
  }
}
