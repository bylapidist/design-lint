import { JsonPointer } from 'jsonpointerx';

function normalizeFragment(fragment: string): string {
  if (fragment === '' || fragment === '/') {
    return '';
  }
  return fragment.startsWith('/') ? fragment : `/${fragment}`;
}

export function canonicalizePointer(
  ref: string,
  context: string,
  label = '$ref',
): string {
  try {
    const hashIndex = ref.indexOf('#');
    if (hashIndex === -1) {
      if (ref === '') {
        return '';
      }
      if (ref === '/' || ref === '#') {
        return '';
      }
      return JsonPointer.compile(ref).toString();
    }

    const document = ref.slice(0, hashIndex);
    const fragment = normalizeFragment(ref.slice(hashIndex + 1));
    if (document === '') {
      if (fragment === '') {
        return '';
      }
      return JsonPointer.compile(fragment).toString();
    }

    if (fragment === '') {
      return `${document}#`;
    }

    const pointer = JsonPointer.compile(fragment).toString();
    return `${document}#${pointer}`;
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : '';
    throw new Error(`${context} has invalid ${label} "${ref}"${detail}`);
  }
}

export function segmentsToPointer(segments: (string | number)[]): string {
  if (segments.length === 0) {
    return '';
  }
  return new JsonPointer(segments.map((segment) => String(segment))).toString();
}
