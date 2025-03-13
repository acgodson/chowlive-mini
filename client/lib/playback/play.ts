import { PlaybackProps, PlaybackResponse } from '.';
import { calculateProgress } from './utils/calculateProgress';
import { handleAndReturn } from './utils/handleAndReturn';
import SpotifyAPI from '../spotify';

export type PlaybackAPIPlayProps = PlaybackProps & {
  progress: number; // ms position
};

export const play = async (props: PlaybackAPIPlayProps): Promise<PlaybackResponse<void> | void> => {
  const { song } = props;

  if (!song) return;

  const progress = calculateProgress(song);
  const updatedProps = { ...props, progress };

  const spotify = song.spotifyUri ? SpotifyAPI.play(updatedProps) : SpotifyAPI.pause(updatedProps);

  return handleAndReturn({
    spotify,
  });
};
