import SpotifyAPI from ".";
import { PlaybackProps } from "../playback";

export const pause = async (props: PlaybackProps) => {
  const device_id = await SpotifyAPI.getTargetDevice(props);
  if (!device_id) return;

  try {
    // Get current position from song if available, or use 0 as fallback
    let currentPosition = props.song?.progress || 0;

    try {
      const state = await props.spotify.getMyCurrentPlaybackState();
      if (state && state.progress_ms) {
        currentPosition = state.progress_ms;
        console.log(
          `[PlaybackAPI] Got current position before pausing: ${currentPosition}ms`
        );
      }
    } catch (positionError) {
      console.warn(
        "[PlaybackAPI] Could not get current position:",
        positionError
      );
      // Continue with the position we have from song
    }

    console.log(`[PlaybackAPI] Pausing at position: ${currentPosition}ms`);

    // Pause the spotify player
    const result = await props.spotify.pause();

    return {
      success: true,
      position: currentPosition,
      result,
    };
  } catch (error) {
    console.error("[PlaybackAPI] Error pausing:", error);
    return {
      success: false,
      error,
    };
  }
};
