import type { LiveInfo, Track, ShowInfo } from './types.js';

export function toUtcIso(localDateStr: string, timezone: string): string {
  // Reframe the local date as UTC, then correct by the actual timezone offset.
  const asIfUtc = new Date(localDateStr.replace(' ', 'T') + 'Z');

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(asIfUtc);

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0';
  const localMs = Date.UTC(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second')),
  );

  const offsetMs = asIfUtc.getTime() - localMs;
  return new Date(asIfUtc.getTime() + offsetMs).toISOString();
}

function normalizeTrack(track: Track, tz: string): Track {
  return {
    ...track,
    starts: toUtcIso(track.starts, tz),
    ends: toUtcIso(track.ends, tz),
  };
}

function normalizeShow(show: ShowInfo, tz: string): ShowInfo {
  return {
    ...show,
    starts: toUtcIso(show.starts, tz),
    ends: toUtcIso(show.ends, tz),
  };
}

export function comparableSnapshot(data: LiveInfo): string {
  const { station: { schedulerTime: _dropped, ...station }, ...rest } = data;
  return JSON.stringify({ ...rest, station });
}

export function normalize(data: LiveInfo): LiveInfo {
  const tz = data.station.timezone;
  return {
    ...data,
    tracks: {
      previous: data.tracks.previous ? normalizeTrack(data.tracks.previous, tz) : null,
      current: data.tracks.current ? normalizeTrack(data.tracks.current, tz) : null,
      next: data.tracks.next ? normalizeTrack(data.tracks.next, tz) : null,
    },
    shows: {
      previous: data.shows.previous.map(s => normalizeShow(s, tz)),
      current: data.shows.current ? normalizeShow(data.shows.current, tz) : null,
      next: data.shows.next.map(s => normalizeShow(s, tz)),
    },
  };
}
