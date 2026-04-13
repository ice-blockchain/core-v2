const UPLOADABLE_PREFIXES = [
  'image/',
  'video/',
  'audio/',
  'application/x-brotli',
];

const BLOCKED_CONTENT_TYPES = new Set(['image/svg+xml']);

export type EventDisposition = 'upload' | 'skip';

export default function classifyContentType(
  contentType: string,
): EventDisposition {
  if (!contentType) return 'skip';

  const normalized = contentType.toLowerCase().trim();
  const mimeBase = normalized.split(';')[0].trim();
  if (BLOCKED_CONTENT_TYPES.has(mimeBase)) return 'skip';

  const isUploadable = UPLOADABLE_PREFIXES.some((prefix) =>
    mimeBase.startsWith(prefix),
  );

  return isUploadable ? 'upload' : 'skip';
}
