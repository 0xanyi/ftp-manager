export function parseAllowedOrigins(
  raw: string | undefined,
  defaultOrigins: string[] = ['http://localhost:5173'],
): string[] {
  const normalized = new Set<string>();

  if (typeof raw === 'string' && raw.length > 0) {
    const entries = raw.split(',');
    for (let index = 0; index < entries.length; index += 1) {
      const candidate = entries[index].trim();
      if (!candidate) {
        continue;
      }

      if (candidate === '*') {
        normalized.add('*');
        continue;
      }

      let withoutTrailingSlash = candidate;
      while (withoutTrailingSlash.endsWith('/')) {
        withoutTrailingSlash = withoutTrailingSlash.slice(0, -1);
      }

      normalized.add(withoutTrailingSlash.toLowerCase());
    }
  }

  if (normalized.size === 0) {
    for (let index = 0; index < defaultOrigins.length; index += 1) {
      const candidate = defaultOrigins[index].trim();
      if (!candidate) {
        continue;
      }

      if (candidate === '*') {
        normalized.add('*');
        continue;
      }

      let withoutTrailingSlash = candidate;
      while (withoutTrailingSlash.endsWith('/')) {
        withoutTrailingSlash = withoutTrailingSlash.slice(0, -1);
      }

      normalized.add(withoutTrailingSlash.toLowerCase());
    }
  }

  const result: string[] = [];
  for (const value of normalized) {
    result.push(value);
  }

  return result;
}
