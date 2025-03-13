import Service from '@/components/models/Service';

import PlaybackAPI, { PlaybackProps } from '.';
import SpotifyAPI from '../spotify';

export const getSongDuration = async (props: PlaybackProps): Promise<number> => {
  if (!props.song) return 1;

  const service = PlaybackAPI.getActiveService(props);

  if (service === Service.Spotify) return await SpotifyAPI.getSongDuration(props);

  return 1;
};
