export interface TrackMetadata {
  id: number;
  name: string;
  mime: string;
  ftype: string;
  filepath: string;
  import_status: number;
  currentlyaccessing: number;
  editedby: number | null;
  mtime: string;
  utime: string;
  lptime: string | null;
  md5: string | null;
  track_title: string | null;
  artist_name: string | null;
  bit_rate: number | null;
  sample_rate: number | null;
  format: string | null;
  length: string;
  album_title: string | null;
  genre: string | null;
  comments: string | null;
  year: string | null;
  track_number: string | null;
  channels: number | null;
  url: string | null;
  bpm: string | null;
  rating: string | null;
  encoded_by: string | null;
  disc_number: string | null;
  mood: string | null;
  label: string | null;
  composer: string | null;
  encoder: string | null;
  checksum: string | null;
  lyrics: string | null;
  orchestra: string | null;
  conductor: string | null;
  lyricist: string | null;
  original_lyricist: string | null;
  radio_station_name: string | null;
  info_url: string | null;
  artist_url: string | null;
  audio_source_url: string | null;
  radio_station_url: string | null;
  buy_this_url: string | null;
  isrc_number: string | null;
  catalog_number: string | null;
  original_artist: string | null;
  copyright: string | null;
  report_datetime: string | null;
  report_location: string | null;
  report_organization: string | null;
  subject: string | null;
  contributor: string | null;
  language: string | null;
  replay_gain: string | null;
  owner_id: number;
  cuein: string;
  cueout: string;
  hidden: boolean;
  filesize: number;
  description: string | null;
  artwork: string;
  track_type_id: number | null;
}

export interface Track {
  starts: string;
  ends: string;
  type: string;
  name: string;
  media_item_played?: boolean;
  record?: string;
  metadata: TrackMetadata;
}

export interface ShowInfo {
  name: string;
  description: string;
  genre: string;
  id: number;
  instance_id: number;
  record: number;
  url: string;
  image_path: string;
  starts: string;
  ends: string;
}

export interface LiveInfo {
  station: {
    env: string;
    schedulerTime: string;
    source_enabled: string;
    timezone: string;
    AIRTIME_API_VERSION: string;
  };
  tracks: {
    previous: Track | null;
    current: Track | null;
    next: Track | null;
  };
  shows: {
    previous: ShowInfo[];
    current: ShowInfo | null;
    next: ShowInfo[];
  };
  sources: {
    livedj: string;
    masterdj: string;
    scheduledplay: string;
  };
}
