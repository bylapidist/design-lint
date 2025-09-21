import { JsonPointer } from 'jsonpointerx';

function normalizeFragment(fragment: string): string {
  if (fragment === '' || fragment === '/') {
    return '';
  }
  return fragment.startsWith('/') ? fragment : `/${fragment}`;
}

function assertValidPointerEscapes(
  fragment: string,
  ref: string,
  context: string,
  label: string,
): void {
  for (let i = 0; i < fragment.length; i += 1) {
    if (fragment[i] !== '~') continue;
    const next = fragment[i + 1];
    if (next === '0' || next === '1') {
      i += 1;
      continue;
    }
    throw new Error(
      `${context} has invalid ${label} "${ref}": "~" must be followed by 0 or 1`,
    );
  }
}

function assertNoPointerTraversal(
  fragment: string,
  ref: string,
  context: string,
  label: string,
): void {
  if (fragment === '') {
    return;
  }
  const normalized = fragment.startsWith('/') ? fragment : `/${fragment}`;
  if (/(^|\/)\.\.(?:\/|$)/.test(normalized)) {
    throw new Error(
      `${context} has invalid ${label} "${ref}": JSON Pointer segments must not include ".."`,
    );
  }
}

function assertValidPointer(
  fragment: string,
  ref: string,
  context: string,
  label: string,
): void {
  if (fragment === '') {
    return;
  }
  assertValidPointerEscapes(fragment, ref, context, label);
  assertNoPointerTraversal(fragment, ref, context, label);
}

function assertNoDocumentTraversal(
  document: string,
  ref: string,
  context: string,
  label: string,
): void {
  if (document === '') {
    return;
  }
  const lower = document.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return;
  }
  const normalized = document.replace(/\\/g, '/');
  if (/(^|\/)\.\.(?:\/|$)/.test(normalized)) {
    throw new Error(
      `${context} has invalid ${label} "${ref}": document references must not traverse parent directories`,
    );
  }
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
      const normalized = normalizeFragment(ref);
      assertValidPointer(normalized, ref, context, label);
      return JsonPointer.compile(ref).toString();
    }

    const document = ref.slice(0, hashIndex);
    const fragment = normalizeFragment(ref.slice(hashIndex + 1));
    assertNoDocumentTraversal(document, ref, context, label);
    if (document === '') {
      if (fragment === '') {
        return '';
      }
      assertValidPointer(fragment, ref, context, label);
      return JsonPointer.compile(fragment).toString();
    }

    if (fragment === '') {
      return `${document}#`;
    }

    assertValidPointer(fragment, ref, context, label);
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
