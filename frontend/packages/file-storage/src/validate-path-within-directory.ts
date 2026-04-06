export function validatePathWithinDirectory(filePath: string, allowedDirectory: string): void {
  const normalized = normalizePath(filePath);
  const normalizedDir = ensureTrailingSlash(normalizePath(allowedDirectory));
  if (!normalized.startsWith(normalizedDir) && normalized !== normalizedDir.slice(0, -1)) {
    throw new Error(`Path escapes allowed directory`);
  }
}

function normalizePath(input: string): string {
  const parts: string[] = [];
  for (const segment of input.split('/')) {
    if (segment === '..') { parts.pop(); }
    else if (segment !== '' && segment !== '.') { parts.push(segment); }
  }
  return (input.startsWith('/') ? '/' : '') + parts.join('/');
}

function ensureTrailingSlash(dir: string): string {
  return dir.endsWith('/') ? dir : dir + '/';
}
