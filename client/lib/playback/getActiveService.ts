import Service from '@/components/models/Service';

import { PlaybackProps } from '.';

export const getActiveService = ({ song }: PlaybackProps): Service => {
  if (!song) return Service.None;

  const { spotifyUri } = song;
  if (spotifyUri) return Service.Spotify;

  return Service.None;
};
