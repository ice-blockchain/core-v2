export async function deduplicatedRefresh(
  username: string,
  locks: Map<string, Promise<void>>,
  refreshFn: (username: string) => Promise<void>,
): Promise<void> {
  const existing = locks.get(username);
  if (existing) { await existing; return; }
  const promise = refreshFn(username);
  locks.set(username, promise);
  try { await promise; } finally { locks.delete(username); }
}
