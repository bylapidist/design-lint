import { isObject } from '../../utils/guards/index.js';
import { parse } from 'culori';

/** Mapping of Design Tokens color space identifiers to culori mode names and
 * their expected component keys and ranges. */
export const COLOR_SPACE_CONFIG: Record<
  string,
  {
    mode: string;
    components: string[];
    ranges?: [number, number, boolean?][];
  }
> = {
  srgb: {
    mode: 'srgb',
    components: ['r', 'g', 'b'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  'srgb-linear': {
    mode: 'srgb-linear',
    components: ['r', 'g', 'b'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  'display-p3': {
    mode: 'p3',
    components: ['r', 'g', 'b'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  'a98-rgb': {
    mode: 'a98',
    components: ['r', 'g', 'b'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  'prophoto-rgb': {
    mode: 'prophoto',
    components: ['r', 'g', 'b'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  rec2020: {
    mode: 'rec2020',
    components: ['r', 'g', 'b'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  hsl: {
    mode: 'hsl',
    components: ['h', 's', 'l'],
    ranges: [
      [0, 360, true],
      [0, 100],
      [0, 100],
    ],
  },
  hwb: {
    mode: 'hwb',
    components: ['h', 'w', 'b'],
    ranges: [
      [0, 360, true],
      [0, 100],
      [0, 100],
    ],
  },
  lab: {
    mode: 'lab',
    components: ['l', 'a', 'b'],
    ranges: [[0, 100]],
  },
  lch: {
    mode: 'lch',
    components: ['l', 'c', 'h'],
    ranges: [
      [0, 100],
      [0, Infinity],
      [0, 360, true],
    ],
  },
  oklab: {
    mode: 'oklab',
    components: ['l', 'a', 'b'],
    ranges: [[0, 1]],
  },
  oklch: {
    mode: 'oklch',
    components: ['l', 'c', 'h'],
    ranges: [
      [0, 1],
      [0, Infinity],
      [0, 360, true],
    ],
  },
  'xyz-d50': {
    mode: 'xyz50',
    components: ['x', 'y', 'z'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
  'xyz-d65': {
    mode: 'xyz65',
    components: ['x', 'y', 'z'],
    ranges: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  },
};

export interface ColorValue {
  colorSpace: keyof typeof COLOR_SPACE_CONFIG;
  components: (number | 'none')[];
  alpha?: number;
  hex?: string;
}

export function validateColor(
  value: unknown,
  path: string,
): asserts value is ColorValue {
  if (typeof value === 'string') {
    const parsed = parse(value);
    if (!parsed) {
      throw new Error(`Token ${path} has invalid color value`);
    }
    return;
  }
  if (!isObject(value)) {
    throw new Error(`Token ${path} has invalid color value`);
  }
  const colorSpace = value.colorSpace;
  if (typeof colorSpace !== 'string') {
    throw new Error(`Token ${path} has invalid color value`);
  }
  const comp = value.components;
  const alpha = value.alpha;
  const hex = value.hex;
  if (!(colorSpace in COLOR_SPACE_CONFIG) || !Array.isArray(comp)) {
    throw new Error(`Token ${path} has invalid color value`);
  }
  const components: unknown[] = comp;
  const cfg = COLOR_SPACE_CONFIG[colorSpace];
  if (
    components.length !== cfg.components.length ||
    !components.every(
      (c): c is number | 'none' =>
        (typeof c === 'number' && Number.isFinite(c)) || c === 'none',
    )
  ) {
    throw new Error(`Token ${path} has invalid color value`);
  }
  if (cfg.ranges) {
    cfg.ranges.forEach(([min, max, maxExclusive], i) => {
      const c = components[i];
      if (c === 'none') return;
      if (
        typeof c !== 'number' ||
        c < min ||
        (maxExclusive ? c >= max : c > max)
      ) {
        throw new Error(`Token ${path} has invalid color value`);
      }
    });
  }
  if (
    alpha !== undefined &&
    (typeof alpha !== 'number' ||
      !Number.isFinite(alpha) ||
      alpha < 0 ||
      alpha > 1)
  ) {
    throw new Error(`Token ${path} has invalid color value`);
  }
  if (
    hex !== undefined &&
    (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex))
  ) {
    throw new Error(`Token ${path} has invalid color value`);
  }
}
