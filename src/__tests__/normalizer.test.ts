import { describe, it, expect } from 'vitest';
import { toUtcIso, normalize } from '../normalizer.js';
import type { LiveInfo } from '../types.js';

describe('toUtcIso', () => {
  it('converts Europe/Paris (UTC+1 in winter) to UTC', () => {
    expect(toUtcIso('2026-01-15 10:00:00', 'Europe/Paris')).toBe('2026-01-15T09:00:00.000Z');
  });

  it('converts Europe/Paris (UTC+2 in summer) to UTC', () => {
    expect(toUtcIso('2026-07-15 12:00:00', 'Europe/Paris')).toBe('2026-07-15T10:00:00.000Z');
  });

  it('converts America/New_York (UTC-5 in winter) to UTC', () => {
    expect(toUtcIso('2026-01-15 10:00:00', 'America/New_York')).toBe('2026-01-15T15:00:00.000Z');
  });

  it('converts UTC timezone unchanged', () => {
    expect(toUtcIso('2026-04-27 10:00:00', 'UTC')).toBe('2026-04-27T10:00:00.000Z');
  });
});

function makeLiveInfo(): LiveInfo {
  return {
    station: {
      env: 'production',
      schedulerTime: '2026-07-15 12:00:00',
      source_enabled: 'Scheduled',
      timezone: 'Europe/Paris',
      AIRTIME_API_VERSION: '1.1',
    },
    tracks: {
      previous: null,
      current: {
        starts: '2026-07-15 12:00:00',
        ends: '2026-07-15 12:30:00',
        type: 'track',
        name: 'Test Track',
        metadata: {} as never,
      },
      next: null,
    },
    shows: {
      previous: [],
      current: null,
      next: [],
    },
    sources: { livedj: 'off', masterdj: 'off', scheduledplay: 'on' },
  };
}

describe('normalize', () => {
  it('converts track starts/ends to UTC ISO', () => {
    const result = normalize(makeLiveInfo());
    expect(result.tracks.current?.starts).toBe('2026-07-15T10:00:00.000Z');
    expect(result.tracks.current?.ends).toBe('2026-07-15T10:30:00.000Z');
  });

  it('leaves null tracks untouched', () => {
    const result = normalize(makeLiveInfo());
    expect(result.tracks.previous).toBeNull();
    expect(result.tracks.next).toBeNull();
  });

  it('does not mutate the original data', () => {
    const original = makeLiveInfo();
    normalize(original);
    expect(original.tracks.current?.starts).toBe('2026-07-15 12:00:00');
  });

  it('preserves all other track fields', () => {
    const result = normalize(makeLiveInfo());
    expect(result.tracks.current?.name).toBe('Test Track');
    expect(result.tracks.current?.type).toBe('track');
  });

  it('preserves station fields', () => {
    const result = normalize(makeLiveInfo());
    expect(result.station.timezone).toBe('Europe/Paris');
    expect(result.station.schedulerTime).toBe('2026-07-15 12:00:00');
  });
});
