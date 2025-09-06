declare module 'tsx/esm';
declare module 'tsx/esm/api' {
  export function tsImport(
    path: string,
    parent: string | { parentURL: string },
  ): Promise<unknown>;
}
