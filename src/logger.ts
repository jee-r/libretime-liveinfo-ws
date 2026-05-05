import { config } from './config.js';

const levels = { debug: 0, info: 1, error: 2 };

export function log(level: 'debug' | 'info' | 'error', message: string): void {
  if (levels[level] >= levels[config.logLevel]) {
    const ts = new Date().toISOString();
    const out = level === 'error' ? console.error : console.log;
    out(`[${ts}] [${level.toUpperCase()}] ${message}`);
  }
}
