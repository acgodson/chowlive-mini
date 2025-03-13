import { PlaybackResponse } from '..';

export const handleAndReturn = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  promises: PlaybackResponse<Promise<any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<PlaybackResponse<any>> => {
  const [spotify] = await Promise.all([promises.spotify]);

  return {
    spotify,
  };
};
