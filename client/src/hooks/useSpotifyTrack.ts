import { useEffect, useState, useCallback, useRef } from "react";
import Song from "@/src/lib/models/Song";
import { useSpotify } from "@/src/services/spotify/spotifyContext";
import { useAuthListener } from "./useAuthListener";

// Static tracking to prevent multiple component instances from making the same API calls
const trackCache = new Map();
const errorTracker = {
  authErrorDetected: false,
  lastErrorTime: 0,
};

const useSpotifyTrack = (song?: Song) => {
  const { spotify } = useSpotify();
  const { spotifyToken, handleSpotifyError, authError, isAuthenticated } =
    useAuthListener();
  const [spotifyTrack, setSpotifyTrack] =
    useState<SpotifyApi.SingleTrackResponse>();
  const [previousSongID, setPreviousSongID] = useState<string | null>(null);
  const songRef = useRef(song);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  // Add debug logging
  // const logDebug = (message: string, data?: any) => {
  //   const prefix = "[useSpotifyTrack]";
  //   if (data) {
  //     console.log(`${prefix} ${message}`, data);
  //   } else {
  //     console.log(`${prefix} ${message}`);
  //   }
  // };

  // Update ref when song changes
  useEffect(() => {
    songRef.current = song;
  }, [song]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;

    // If global error state is in effect, immediately set local state to match
    if (errorTracker.authErrorDetected) {
      setSpotifyTrack(undefined);
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Update tracking when auth error detected
  useEffect(() => {
    if (authError) {
      errorTracker.authErrorDetected = true;
      errorTracker.lastErrorTime = Date.now();
    }
  }, [authError]);

  // Reset global error tracking when token changes successfully
  useEffect(() => {
    if (spotifyToken && isAuthenticated) {
      errorTracker.authErrorDetected = false;
    }
  }, [spotifyToken, isAuthenticated]);

  const loadTrack = useCallback(async () => {
    // Skip if unmounted or loading or global error tracking says don't try
    if (
      !mountedRef.current ||
      loadingRef.current ||
      errorTracker.authErrorDetected
    )
      return;

    // Don't attempt to load if we have an auth error or no token
    if (authError || !spotifyToken || !isAuthenticated) {
      return;
    }

    // Use the ref to access the latest song value
    const currentSong = songRef.current;
    if (!currentSong?.spotifyUri) return;

    // Check cache first
    if (trackCache.has(currentSong.id)) {
      const cachedTrack = trackCache.get(currentSong.id);
      if (cachedTrack && previousSongID !== currentSong.id) {
        setPreviousSongID(currentSong.id);
        setSpotifyTrack(cachedTrack);
        return;
      }
    }

    // Skip if already loaded
    if (previousSongID === currentSong.id && spotifyTrack) return;

    try {
      loadingRef.current = true;
      setPreviousSongID(currentSong.id);

      // Set token and extract track ID
      spotify.setAccessToken(spotifyToken);
      const trackId = currentSong.spotifyUri.split(":")[2];

      const response = await spotify.getTrack(trackId);

      // Cache the result
      trackCache.set(currentSong.id, response);

      // Only update state if component still mounted and song still current
      if (mountedRef.current && songRef.current?.id === currentSong.id) {
        setSpotifyTrack(response);
      }
    } catch (error: any) {
      // Avoid processing the error if we're already in error state or unmounted
      if (!mountedRef.current || errorTracker.authErrorDetected) return;

      console.error("Error loading Spotify track:", error);

      // Handle auth error just once
      if (error?.status === 401 && !errorTracker.authErrorDetected) {
        errorTracker.authErrorDetected = true;
        errorTracker.lastErrorTime = Date.now();
        handleSpotifyError(error);

        // Clear local state
        if (mountedRef.current) {
          setSpotifyTrack(undefined);
        }
      }
    } finally {
      if (mountedRef.current) {
        loadingRef.current = false;
      }
    }
  }, [
    previousSongID,
    spotify,
    spotifyTrack,
    authError,
    spotifyToken,
    isAuthenticated,
    handleSpotifyError,
  ]);

  useEffect(() => {
    // Skip if global error state active
    if (errorTracker.authErrorDetected) {
      // Only attempt again after 5 seconds
      const now = Date.now();
      if (now - errorTracker.lastErrorTime < 5000) return;

      // Reset the global flag if it's been long enough
      errorTracker.authErrorDetected = false;
    }

    // If song changed, load the track
    if (
      song?.id &&
      song?.spotifyUri &&
      (!spotifyTrack || previousSongID !== song?.id)
    ) {
      loadTrack();
    }
  }, [song?.id, loadTrack, previousSongID, spotifyTrack]);

  return spotifyTrack;
};

export default useSpotifyTrack;
