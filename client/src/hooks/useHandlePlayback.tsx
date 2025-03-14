import { useEffect, useState, useRef, useCallback } from "react";
import { useAtom } from "jotai";
import PlaybackAPI from "@/src/lib/playback";
import Song from "@/src/lib/models/Song";
import { playbackConfigurationAtom } from "@/src/state/playbackConfigurationAtom";
// import useStore from "@/components/state/store";
import useSongProgress from "./useSongProgress";
import { getDatabase, ref, get } from "firebase/database";
// import { useUpProvider } from "./upProvider";
import { PLAYBACK_STATE } from "@/src/lib/playback/getPlaybackStatus";
import { signInWithCustomToken, getAuth } from "firebase/auth";
import { useSpotify } from "@/src/services/spotify/spotifyContext";

export default function useHandlePlayback(
  song?: Song,
  onProgressUpdate?: (progress: number) => void
) {
  // const { accounts } = useUpProvider();
  const [user, setUser] = useState<any>(null);
  const { spotify } = useSpotify();

  // Use useRef for values that shouldn't trigger re-renders
  const progressRef = useRef(0);

  const [playbackConfiguration] = useAtom(playbackConfigurationAtom);

  // Get progress from the hook
  const progress = useSongProgress(song);

  // Update the ref and call the callback whenever progress changes
  useEffect(() => {
    progressRef.current = progress;
    if (onProgressUpdate) {
      onProgressUpdate(progress);
    }
  }, [progress, onProgressUpdate]);

  // Function to get cookie value
  const getCookie = useCallback((name: string): string | null => {
    if (typeof document === "undefined") return null;

    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }, []);

  // Firebase auth initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        const firebaseToken = getCookie("firebase_auth_token");
        if (firebaseToken) {
          const auth = getAuth();
          const userCredential = await signInWithCustomToken(
            auth,
            firebaseToken
          );
          setUser(userCredential.user);
        }
      } catch (error) {
        console.error("Error initializing auth from cookie:", error);
      }
    };

    initAuth();
  }, [getCookie]);

  // Function to fetch Spotify token
  const fetchSpotifyToken = useCallback(async () => {
    const spotifyTokenFromCookie = getCookie("spotify_token");
    if (spotifyTokenFromCookie) {
      return spotifyTokenFromCookie;
    }

    if (user?.uid) {
      try {
        const rtdb = getDatabase();
        const tokenSnapshot = await get(
          ref(rtdb, `spotifyAccessToken/${user.uid}`)
        );
        const accessToken = tokenSnapshot.val();

        if (accessToken) {
          document.cookie = `spotify_token=${accessToken};path=/;max-age=2592000;samesite=none;secure`;
        }

        return accessToken;
      } catch (error) {
        console.error("Error fetching Spotify token from Firebase:", error);
      }
    }

    return null;
  }, [getCookie, user?.uid]);

  // Handle playback updates with useCallback
  const updatePlayback = useCallback(async () => {
    if (!user && !getCookie("firebase_auth_token")) {
      return;
    }

    const provider_token = await fetchSpotifyToken();
    if (!provider_token) {
      return;
    }

    if (!song || !song.duration_ms) return;
    if (progressRef.current <= 10) return;
    if (song.duration_ms <= 10) return;
    if (!playbackConfiguration.linked) return;

    const props = {
      spotify,
      spotifyAccessToken: provider_token,
      song,
      progress: progressRef.current,
    };

    try {
      const [playback, isSynchronized] = await Promise.all([
        PlaybackAPI.getPlaybackStatus(props),
        PlaybackAPI.getIsSynchronized(props),
      ]);

      const isClientPlaying = playback === PLAYBACK_STATE.PLAYING;
      const isSongOver = song.duration_ms <= progressRef.current;

      if (isSongOver) {
        await PlaybackAPI.pause(props);
        await PlaybackAPI.skip(props);
      } else if (isClientPlaying && song.isPaused) {
        await PlaybackAPI.pause(props);
      } else if (!isClientPlaying && !song.isPaused) {
        await PlaybackAPI.play(props);
      } else if (!isSynchronized && !song.isPaused) {
        await PlaybackAPI.play(props);
      }
    } catch (error) {
      console.error("Error in playback handling:", error);
    }
  }, [
    user,
    getCookie,
    fetchSpotifyToken,
    song?.id,
    song?.duration_ms,
    song?.isPaused,
    playbackConfiguration.linked,
    spotify,
  ]);

  // Use the updatePlayback function in an effect
  useEffect(() => {
    if ((user || getCookie("firebase_auth_token")) && song) {
      updatePlayback();
    }
  }, [updatePlayback, user, getCookie, song]);

  return {
    isAuthenticated: !!user,
    user,
  };
}
