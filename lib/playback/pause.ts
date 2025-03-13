import { PlaybackProps, PlaybackResponse } from '.';
import { handleAndReturn } from './utils/handleAndReturn';
import SpotifyAPI from '../spotify';

export const pause = async (props: PlaybackProps): Promise<PlaybackResponse<void>> =>
  handleAndReturn({
    spotify: SpotifyAPI.pause(props),
  });
