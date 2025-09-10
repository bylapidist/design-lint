declare module 'yaml-to-momoa' {
  import type { DocumentNode } from '@humanwhocodes/momoa';
  export default function yamlToMomoa(source: string): DocumentNode;
}
