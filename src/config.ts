const LOG_LEVELS = ['debug', 'info', 'error'] as const;
type LogLevel = typeof LOG_LEVELS[number];

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function parseIntEnv(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Env var ${key} must be an integer, got: "${raw}"`);
  return parsed;
}

function parseLogLevel(key: string, defaultValue: LogLevel): LogLevel {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  if (!(LOG_LEVELS as readonly string[]).includes(raw)) {
    throw new Error(`Env var ${key} must be one of ${LOG_LEVELS.join(', ')}, got: "${raw}"`);
  }
  return raw as LogLevel;
}

export const config = {
  libretimeUrl: requireEnv('LIBRETIME_URL'),
  port: parseIntEnv('PORT', 3001),
  pollInterval: parseIntEnv('POLL_INTERVAL', 1000),
  logLevel: parseLogLevel('LOG_LEVEL', 'info'),
  retryInitialDelay: parseIntEnv('RETRY_INITIAL_DELAY', 1000),
  retryMaxDelay: parseIntEnv('RETRY_MAX_DELAY', 30000),
  normalizeDates: process.env.NORMALIZE_DATES === 'true',
  fetchTimeoutMs: parseIntEnv('FETCH_TIMEOUT_MS', 5000),
  heartbeatInterval: parseIntEnv('HEARTBEAT_INTERVAL', 30000),
};
