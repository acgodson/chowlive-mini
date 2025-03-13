import { useEffect, useState } from "react";
import { getDatabase, get, ref } from "firebase/database";
import Song from "@/components/models/Song";
// import { useUpProvider } from "./upProvider";
import { signInWithCustomToken, getAuth } from "firebase/auth";
import { useSpotify } from "./state/spotifyContext";

const useSpotifyTrack = (song?: Song) => {
  const { spotify } = useSpotify();

  // const { accounts } = useUpProvider();
  const [spotifyTrack, setSpotifyTrack] =
    useState<SpotifyApi.SingleTrackResponse>();
  const [previousSongID, setPreviousSongID] = useState("");
  const [user, setUser] = useState<any>(null);

  // Function to get cookie value
  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;

    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  // Initialize Firebase auth and get user on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get Firebase token from cookie
        const firebaseToken = getCookie("firebase_auth_token");

        if (firebaseToken) {
          const auth = getAuth();
          // Sign in with the token from cookie
          const userCredential = await signInWithCustomToken(
            auth,
            firebaseToken
          );
          setUser(userCredential.user);
        } else {
          console.log("No Firebase token found in cookies");
        }
      } catch (error) {
        console.error("Error initializing auth from cookie:", error);
      }
    };

    initAuth();
  }, []);

  // Function to fetch Spotify token from Firebase or cookie
  async function fetchSpotifyToken() {
    // First try to get token from cookie (faster)
    const spotifyTokenFromCookie = getCookie("spotify_token");
    if (spotifyTokenFromCookie) {
      return spotifyTokenFromCookie;
    }

    // If no cookie token and we have a user, try from Firebase
    if (user?.uid) {
      try {
        const rtdb = getDatabase();
        const tokenSnapshot = await get(
          ref(rtdb, `spotifyAccessToken/${user.uid}`)
        );
        const accessToken = tokenSnapshot.val();

        // If found, store in cookie for next time
        if (accessToken) {
          document.cookie = `spotify_token=${accessToken};path=/;max-age=2592000;samesite=none;secure`;
        }

        return accessToken;
      } catch (error) {
        console.error("Error fetching Spotify token from Firebase:", error);
        return null;
      }
    }

    return null;
  }

  const loadTrack = async () => {
    try {
      // Only proceed if we have a song with a Spotify URI
      if (!song || !song.spotifyUri) {
        return;
      }

      // If this is the same song we already loaded, don't reload it
      if (previousSongID === song.id && spotifyTrack) {
        return;
      }

      // Get the Spotify token
      const provider_token = await fetchSpotifyToken();
      if (!provider_token) {
        console.log("No Spotify token available");
        return;
      }

      // Reset the current track and update the previous song ID
      setSpotifyTrack(undefined);
      setPreviousSongID(song.id);

      // Set the access token and fetch the track details
      spotify.setAccessToken(provider_token);

      // Extract the track ID from the Spotify URI
      const trackId = song.spotifyUri.split(":")[2];

      // Fetch track details
      const response = await spotify.getTrack(trackId);
      setSpotifyTrack(response);
    } catch (error) {
      console.error("Error loading Spotify track:", error);
    }
  };

  useEffect(() => {
    if (song && (song.id !== previousSongID || !spotifyTrack)) {
      loadTrack();
    }
  }, [user, song, spotify]);

  return spotifyTrack;
};

export default useSpotifyTrack;
