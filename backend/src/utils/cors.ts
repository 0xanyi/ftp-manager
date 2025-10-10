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

export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[],
): boolean {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.length === 0) {
    return false;
  }

  for (let index = 0; index < allowedOrigins.length; index += 1) {
    if (allowedOrigins[index] === '*') {
      return true;
    }
  }

  let candidate = origin.trim();
  if (!candidate) {
    return false;
  }

  while (candidate.endsWith('/')) {
    candidate = candidate.slice(0, -1);
  }

  const normalizedCandidate = candidate.toLowerCase();

  for (let index = 0; index < allowedOrigins.length; index += 1) {
    if (allowedOrigins[index] === normalizedCandidate) {
      return true;
    }
  }

  return false;
}

export function buildConnectSrcDirectives(
  allowedOrigins: string[],
  additionalRaw?: string,
): string[] {
  const directives = new Set<string>();

  directives.add("'self'");
  directives.add('https:');
  directives.add('http:');
  directives.add('wss:');
  directives.add('ws:');

  for (let index = 0; index < allowedOrigins.length; index += 1) {
    directives.add(allowedOrigins[index]);
  }

  const additional = parseAllowedOrigins(additionalRaw, []);
  for (let index = 0; index < additional.length; index += 1) {
    directives.add(additional[index]);
  }

  const result: string[] = [];
  for (const value of directives) {
    result.push(value);
  }

  return result;
}
