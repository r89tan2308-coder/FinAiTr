export function stableTextHash(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  let hash = 2166136261;

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return `fnv1a-${hash.toString(16).padStart(8, "0")}`;
}
