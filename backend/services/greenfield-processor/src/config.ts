import type { CdnUploaderConfig } from './types.js';

const SIXTEEN_MB = 16 * 1024 * 1024;
const FIFTY_MB = 50 * 1024 * 1024;
const FIVE_HUNDRED_MB = 500 * 1024 * 1024;

export default function loadConfig(): CdnUploaderConfig {
  const required = readRequiredEnv([
    'BUNNY_STORAGE_ZONE',
    'BUNNY_STORAGE_PASSWORD',
  ]);

  const spPattern = env('ALLOWED_SP_HOSTNAME_PATTERN', '');
  validateSpHostnamePattern(spPattern);

  return {
    redisUrl: env('REDIS_URL', 'redis://localhost:6379'),
    greenfieldRpcUrl: env(
      'GREENFIELD_RPC_URL',
      'https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org:443',
    ),
    greenfieldChainId: env('GREENFIELD_CHAIN_ID', 'greenfield_5600-1'),
    bunnyStorageZone: required.BUNNY_STORAGE_ZONE,
    bunnyStoragePassword: required.BUNNY_STORAGE_PASSWORD,
    bunnyStorageRegion: env('BUNNY_STORAGE_REGION', 'ny'),
    bunnyFtpHost: env('BUNNY_FTP_HOST', 'storage.bunnycdn.com'),
    ftpSecure: boolEnv('FTP_SECURE', true),
    ftpMaxConnections: intEnv('FTP_MAX_CONNECTIONS', 5),
    httpUploadSizeLimit: intEnv('HTTP_UPLOAD_SIZE_LIMIT', FIFTY_MB),
    maxDownloadSize: intEnv('MAX_DOWNLOAD_SIZE', FIVE_HUNDRED_MB),
    batchMaxSize: intEnv('BATCH_MAX_SIZE', 20),
    batchFlushIntervalMs: intEnv('BATCH_FLUSH_INTERVAL_MS', 10_000),
    uploadConcurrency: intEnv('UPLOAD_CONCURRENCY', 5),
    port: intEnv('PORT', 3001),
    logLevel: env('LOG_LEVEL', 'info'),
    sourceQueueName: env('SOURCE_QUEUE_NAME', 'greenfield-events'),
    tempDir: env('TEMP_DIR', '/tmp/greenfield-processor'),
    allowedSpHostnamePattern: spPattern,
    maxSegmentSize: intEnv('MAX_SEGMENT_SIZE', SIXTEEN_MB),
  };
}

function boolEnv(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw === 'true' || raw === '1';
}

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function intEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${key} must be an integer, got "${raw}"`);
  }
  return parsed;
}

const MAX_SP_PATTERN_LENGTH = 200;

function validateSpHostnamePattern(pattern: string): void {
  if (!pattern) return;
  if (pattern.length > MAX_SP_PATTERN_LENGTH) {
    throw new Error(
      `ALLOWED_SP_HOSTNAME_PATTERN too long: ${pattern.length} exceeds max ${MAX_SP_PATTERN_LENGTH}`,
    );
  }
  try {
    new RegExp(pattern);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `ALLOWED_SP_HOSTNAME_PATTERN is not a valid regex: ${message}`,
    );
  }
}

function readRequiredEnv(keys: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const missing: string[] = [];
  for (const key of keys) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
    } else {
      result[key] = value;
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  return result;
}
