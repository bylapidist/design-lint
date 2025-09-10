declare module '@humanwhocodes/momoa' {
  export function parse(
    source: string,
    options?: { mode?: 'json'; ranges?: boolean },
  ): unknown;
  export function evaluate(ast: unknown): unknown;
}
