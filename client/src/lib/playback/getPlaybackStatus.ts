export enum PLAYBACK_STATE {
  LOADING = "loading",
  PLAYING = "playing",
  PAUSED = "paused",
  FINISHED = "finished",
  NONE = "none",
}
import Service from "@/src/lib/models/Service";

import PlaybackAPI, { PlaybackProps } from ".";
import SpotifyAPI from "../spotify";

export const getPlaybackStatus = async (
  props: PlaybackProps
): Promise<PLAYBACK_STATE> => {
  const service = PlaybackAPI.getActiveService(props);

  let playbackStatus;
  if (service === Service.Spotify) {
    playbackStatus = await SpotifyAPI.getPlaybackStatus(props);
  }

  return playbackStatus;
};
