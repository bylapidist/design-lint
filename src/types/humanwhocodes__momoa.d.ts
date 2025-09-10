declare module '@humanwhocodes/momoa' {
  export interface SourceLocation {
    start: { line: number; column: number };
  }
  export interface IdentifierNode {
    type: 'Identifier';
    name: string;
  }
  export interface StringNode {
    type: 'String';
    value: string;
  }
  export interface MemberNode {
    name: IdentifierNode | StringNode;
    value: ValueNode;
  }
  export interface BaseNode {
    type: string;
    loc: SourceLocation;
  }
  export interface ObjectNode extends BaseNode {
    type: 'Object';
    members: MemberNode[];
  }
  export type ValueNode = ObjectNode | BaseNode;
  export interface DocumentNode {
    body: ObjectNode;
  }
  export function parse(
    source: string,
    options?: { mode?: 'json'; ranges?: boolean },
  ): DocumentNode;
  export function evaluate(ast: unknown): unknown;
}
