declare module 'culori' {
  export interface ParsedColor {
    mode: string;
    [key: string]: unknown;
  }
  export function parse(color: string): ParsedColor | undefined;
  export function formatRgb(color: ParsedColor): string;
  export function formatHex(color: ParsedColor): string;
  export function formatHsl(color: ParsedColor): string;
}
