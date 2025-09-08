declare module 'svelte/compiler' {
  interface Range {
    start: number;
    end: number;
  }

  interface ScriptNode extends Range {
    content: Range;
  }

  interface StyleNode extends Range {
    content: Range;
  }

  interface Ast {
    html?: Range;
    instance?: ScriptNode;
    module?: ScriptNode;
    css?: StyleNode;
  }

  export function parse(template: string): Ast;
}
