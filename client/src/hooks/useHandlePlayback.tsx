import { useEffect, useRef, useCallback } from "react";
import { useAtom } from "jotai";
import PlaybackAPI from "@/src/lib/playback";
import Song from "@/src/lib/models/Song";
import { playbackConfigurationAtom } from "@/src/state/playbackConfigurationAtom";
import useSongProgress from "./useSongProgress";
import { PLAYBACK_STATE } from "@/src/lib/playback/getPlaybackStatus";
import { useSpotify } from "@/src/services/spotify/spotifyContext";
import { useDebounce } from "../configs/debounce";
import { useAuthListener } from "./useAuthListener";

export default function useHandlePlayback(
  song?: Song,
  onProgressUpdate?: (progress: number) => void
) {
  const [playbackConfiguration] = useAtom(playbackConfigurationAtom);
  const { user, spotifyToken: provider_token } = useAuthListener();
  const { spotify } = useSpotify();
  const progressRef = useRef(0);
  const progress = useSongProgress(song);
  const lastSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    progressRef.current = progress;
    if (onProgressUpdate) {
      onProgressUpdate(progress);
    }
  }, [progress, onProgressUpdate]);

  // Handle song changes - explicitly force playback when song changes
  useEffect(() => {
    const handleSongChange = async () => {
      if (!user || !provider_token || !song || !song.spotifyUri) return;

      // Only trigger on song change
      if (lastSongIdRef.current !== song.id) {
        // console.log(
        //   `Song changed from ${lastSongIdRef.current} to ${song.id}. Starting playback.`
        // );
        lastSongIdRef.current = song.id;

        const props = {
          spotify,
          spotifyAccessToken: provider_token,
          song,
          progress: song.progress || 0,
        };

        try {
          // Skip the synchronization check and force a play when song changes
          if (!song.isPaused) {
            // console.log("Forcing play on song change:", song.spotifyUri);
            await PlaybackAPI.play(props);
          }
        } catch (error) {
          console.error("Error starting playback for new song:", error);
        }
      }
    };

    handleSongChange();
  }, [song?.id, user, provider_token, spotify]);

  const updatePlayback = useCallback(async () => {
    // Check if we have the necessary data
    if (!user || !provider_token) {
      // console.log("[useHandlePlayback] No user or token available");
      return;
    }
    if (!song) {
      // console.log("[useHandlePlayback] No song available");
      return;
    }
    if (!song.duration_ms) {
      // console.log("[useHandlePlayback] No duration available");
      return;
    }
    if (!playbackConfiguration.linked) {
      // console.log("[useHandlePlayback] Playback not linked");
      return;
    }

    if (!song.isPaused && progressRef.current <= 10) {
      // console.log(
      //   "[useHandlePlayback] Progress too low for playing song, skipping update"
      // );
      return;
    }

    // Add special logging for paused songs
    if (song.isPaused) {
      // console.log(
      //   `[useHandlePlayback] Song is paused, progress: ${progressRef.current}ms`
      // );
    }

    const props = {
      spotify,
      spotifyAccessToken: provider_token,
      song,
      progress: progressRef.current,
    };

    try {
      // console.log(
      //   "[useHandlePlayback] Checking playback status for song:",
      //   song.id
      // );

      const [playback, isSynchronized] = await Promise.all([
        PlaybackAPI.getPlaybackStatus(props),
        PlaybackAPI.getIsSynchronized(props),
      ]);

      const isClientPlaying = playback === PLAYBACK_STATE.PLAYING;
      const isSongOver =
        !song.isPaused && song.duration_ms - progressRef.current <= 1000;

      // console.log("[useHandlePlayback] Status check:", {
      //   isClientPlaying,
      //   serverPaused: song.isPaused,
      //   isSynchronized,
      //   isSongOver,
      //   progress: progressRef.current,
      //   duration: song.duration_ms,
      // });

      // Handle different playback scenarios
      if (isSongOver) {
        // console.log(
        //   "[useHandlePlayback] Song is over, handling automatic skip"
        // );
        await PlaybackAPI.pause(props);
        await PlaybackAPI.skip(props);
      } else if (isClientPlaying && song.isPaused) {
        // console.log(
        //   "[useHandlePlayback] Client is playing but song is paused, pausing playback"
        // );
        await PlaybackAPI.pause(props);
      } else if (!isClientPlaying && !song.isPaused) {
        // console.log(
        //   "[useHandlePlayback] Client is paused but song is playing, starting playback"
        // );
        // IMPORTANT: Pass the current progress to ensure we resume from the right position
        await PlaybackAPI.play({
          ...props,
          progress: progressRef.current,
        });
      } else if (!isSynchronized && !song.isPaused) {
        // console.log(
        //   "[useHandlePlayback] Playback is out of sync, resyncing at position:",
        //   progressRef.current
        // );
        await PlaybackAPI.play({
          ...props,
          progress: progressRef.current,
        });
      } else {
        // console.log("[useHandlePlayback] No playback changes needed");
      }
    } catch (error) {
      console.error("[useHandlePlayback] Error in playback handling:", error);
    }
  }, [
    user?.uid,
    provider_token,
    song?.id,
    song?.duration_ms,
    song?.isPaused,
    playbackConfiguration.linked,
    spotify,
    progressRef.current,
  ]);

  const debouncedPlayback = useDebounce(updatePlayback, 300);

  useEffect(() => {
    if (user && song) {
      const shouldDebounce = song.duration_ms
        ? progress < song.duration_ms - 1000
        : false;

      void (shouldDebounce ? debouncedPlayback() : updatePlayback());
    }
  }, [debouncedPlayback, updatePlayback, user, song, progress]);

  useEffect(() => {
    return () => {
      lastSongIdRef.current = null;
    };
  }, []);

  return {
    isAuthenticated: !!user,
    user,
  };
}
