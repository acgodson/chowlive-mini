import type Song from '@/components/models/Song';
import { SpotifyAPI } from '@/components/state/store';

import { getActiveService } from './getActiveService';
import { getIsSynchronized } from './getIsSynchronized';
import { getPlaybackStatus } from './getPlaybackStatus';
import { getSongDuration } from './getSongDuration';
import { pause } from './pause';
import { play } from './play';
import { skip } from './skip';

export type PlaybackProps = {
  spotify: SpotifyAPI;
  spotifyAccessToken: string;

  song?: Song;
};

export type PlaybackResponse<T> = {
  spotify: T;
};

const PlaybackAPI = {
  getPlaybackStatus,
  getSongDuration,
  getActiveService,
  getIsSynchronized,
  play,
  pause,
  skip,
};

export default PlaybackAPI;
