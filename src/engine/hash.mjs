// THE COMPOUND — deterministic hashing helpers (no dependencies, same result in Node and browsers).
// FNV-1a 64-bit over UTF-16 code units of a canonical JSON encoding. Not cryptographic: it detects accidental
// drift (content edits, replay divergence, tampered saves), which is all the engine needs.

/** Canonical JSON: object keys sorted recursively, no whitespace, `undefined` dropped like JSON.stringify. */
export function canonicalJson(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) if (v[k] !== undefined) out[k] = sortKeys(v[k]);
    return out;
  }
  return v;
}

/** FNV-1a 64-bit, returned as 16 hex characters. */
export function fnv1a64(str) {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n, mask = 0xffffffffffffffffn;
  for (let i = 0; i < str.length; i++) {
    h ^= BigInt(str.charCodeAt(i));
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, '0');
}

export const hashValue = (value) => fnv1a64(canonicalJson(value));
