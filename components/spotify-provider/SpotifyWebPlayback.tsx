"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
} from "react";
import { get, ref, getDatabase } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import {
  getFirebaseApp,
  getFirebaseAuth,
} from "../../configs/firebase-app-config";

const SPOTIFY_PLAYER_SCRIPT_SRC = "https://sdk.scdn.co/spotify-player.js";

interface SpotifyWebPlaybackContextType {
  isWebPlaybackReady: boolean;
  accessToken: string | null;
  //@ts-ignore
  spotifyPlayer: Spotify.Player | null;
}

const SpotifyWebPlaybackContext = createContext<
  SpotifyWebPlaybackContextType | undefined
>(undefined);

export const useSpotifyWebPlayback = () => {
  const context = useContext(SpotifyWebPlaybackContext);
  if (context === undefined) {
    throw new Error(
      "useSpotifyWebPlayback must be used within a SpotifyWebPlaybackProvider"
    );
  }
  return context;
};

export const SpotifyWebPlaybackProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [isWebPlaybackReady, setIsWebPlaybackReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spotifyPlayer, setSpotifyPlayer] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);

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

  // Add the Spotify Web Playback SDK script to the DOM
  useEffect(() => {
    const existingScript = document.querySelector(
      `script[src="${SPOTIFY_PLAYER_SCRIPT_SRC}"]`
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = SPOTIFY_PLAYER_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      setIsWebPlaybackReady(true);
    };

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const app = getFirebaseApp();
    const auth = getFirebaseAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Fetch access token from both cookie and Firebase
  useEffect(() => {
    const fetchToken = async () => {
      // First check cookie
      const spotifyTokenFromCookie = getCookie("spotify_token");
      if (spotifyTokenFromCookie) {
        console.log("Found Spotify token in cookie");
        setAccessToken(spotifyTokenFromCookie);
        return;
      }

      // If not in cookie and user is logged in, try Firebase
      if (user) {
        try {
          const rtdb = getDatabase();
          const tokenSnapshot = await get(
            ref(rtdb, `spotifyAccessToken/${user.uid}`)
          );

          const fetchedAccessToken = tokenSnapshot.val();
          if (fetchedAccessToken) {
            console.log("Found Spotify token in Firebase");
            setAccessToken(fetchedAccessToken);

            // Optionally store in cookie for next time
            document.cookie = `spotify_token=${fetchedAccessToken};path=/;max-age=2592000;samesite=none;secure`;
          }
        } catch (error) {
          console.error("Error fetching token from Firebase:", error);
        }
      }
    };

    fetchToken();

    // Set up an interval to check for token changes
    const tokenCheckInterval = setInterval(() => {
      const currentToken = getCookie("spotify_token");
      if (currentToken && currentToken !== accessToken) {
        setAccessToken(currentToken);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(tokenCheckInterval);
  }, [user, accessToken]);

  // Create the Spotify Web Player
  useEffect(() => {
    if (!isWebPlaybackReady || !accessToken || spotifyPlayer) return;

    console.log("Creating Spotify Web Player...");

    // @ts-ignore - Spotify will be defined by the SDK
    const player = new Spotify.Player({
      name: "LUKSO Music Rooms",
      getOAuthToken: (cb: (token: string) => void) => {
        cb(accessToken as string);
      },
      volume: 0.5,
    });

    // Error handling
    player.addListener(
      "initialization_error",
      ({ message }: { message: string }) =>
        console.error("Initialization error:", message)
    );
    player.addListener(
      "authentication_error",
      ({ message }: { message: string }) =>
        console.error("Authentication error:", message)
    );
    player.addListener("account_error", ({ message }: { message: string }) =>
      console.error("Account error:", message)
    );
    player.addListener("playback_error", ({ message }: { message: string }) =>
      console.error("Playback error:", message)
    );

    // Ready and Not Ready listeners
    player.addListener("ready", ({ device_id }: { device_id: string }) => {
      console.log("Spotify player ready with Device ID:", device_id);
      // Store device ID for later use
      localStorage.setItem("spotify_device_id", device_id);
    });

    player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
      console.log("Spotify player device ID has gone offline:", device_id);
    });

    // Connect to the player
    player
      .connect()
      .then((success: boolean) => {
        if (success) {
          console.log("Spotify Web Playback SDK successfully connected!");
        }
      })
      .catch((error: any) => {
        console.error("Failed to connect to Spotify:", error);
      });

    setSpotifyPlayer(player);

    // Cleanup when component unmounts
    return () => {
      player.disconnect();
    };
  }, [isWebPlaybackReady, accessToken, spotifyPlayer]);

  const value = {
    isWebPlaybackReady,
    accessToken,
    spotifyPlayer,
  };

  return (
    <SpotifyWebPlaybackContext.Provider value={value}>
      {children}
    </SpotifyWebPlaybackContext.Provider>
  );
};
