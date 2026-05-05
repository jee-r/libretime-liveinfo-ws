import { describe, it, expect } from 'vitest';
import { comparableSnapshot } from '../normalizer.js';
import type { LiveInfo } from '../types.js';

function makeLiveInfo(overrides: Partial<LiveInfo['station']> = {}, trackStarts = '2026-04-27 10:00:00'): LiveInfo {
  return {
    station: {
      env: 'production',
      schedulerTime: '2026-04-27 10:00:00',
      source_enabled: 'Scheduled',
      timezone: 'Europe/Paris',
      AIRTIME_API_VERSION: '1.1',
      ...overrides,
    },
    tracks: {
      previous: null,
      current: {
        starts: trackStarts,
        ends: '2026-04-27 10:30:00',
        type: 'track',
        name: 'Test Track',
        metadata: {} as never,
      },
      next: null,
    },
    shows: { previous: [], current: null, next: [] },
    sources: { livedj: 'off', masterdj: 'off', scheduledplay: 'on' },
  };
}

describe('comparableSnapshot', () => {
  it('returns the same value when only schedulerTime changes', () => {
    const a = makeLiveInfo({ schedulerTime: '2026-04-27 10:00:00' });
    const b = makeLiveInfo({ schedulerTime: '2026-04-27 10:00:01' });
    expect(comparableSnapshot(a)).toBe(comparableSnapshot(b));
  });

  it('detects a track change', () => {
    const a = makeLiveInfo({}, '2026-04-27 10:00:00');
    const b = makeLiveInfo({}, '2026-04-27 10:30:00');
    expect(comparableSnapshot(a)).not.toBe(comparableSnapshot(b));
  });

  it('detects a source change', () => {
    const a = makeLiveInfo({ source_enabled: 'Scheduled' });
    const b = makeLiveInfo({ source_enabled: 'Live' });
    expect(comparableSnapshot(a)).not.toBe(comparableSnapshot(b));
  });

  it('does not include schedulerTime in the snapshot', () => {
    const data = makeLiveInfo({ schedulerTime: '2026-04-27 10:00:00' });
    expect(comparableSnapshot(data)).not.toContain('schedulerTime');
  });
});
