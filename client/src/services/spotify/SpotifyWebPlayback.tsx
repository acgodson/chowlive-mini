"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
} from "react";
import { useAuthListener } from "@/src/hooks/useAuthListener";

const SPOTIFY_PLAYER_SCRIPT_SRC = "https://sdk.scdn.co/spotify-player.js";

interface SpotifyWebPlaybackContextType {
  isWebPlaybackReady: boolean;
  accessToken: string | null;
  // @ts-expect-error
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
  const [spotifyPlayer, setSpotifyPlayer] = useState<any | null>(null);
  const authListener = useAuthListener();
  const { spotifyToken: accessToken, authError } = authListener;
  
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

    return () => {};
  }, []);

  // Disconnect player when auth error occurs
  useEffect(() => {
    if (authError && spotifyPlayer) {
      console.log("Auth error detected, disconnecting Spotify player");
      spotifyPlayer.disconnect();
      setSpotifyPlayer(null);
    }
  }, [authError, spotifyPlayer]);

  // Create the Spotify Web Player
  useEffect(() => {
    if (!isWebPlaybackReady || !accessToken || spotifyPlayer || authError)
      return;

    console.log("Creating Spotify Web Player with token");

    // @ts-expect-error
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
      ({ message }: { message: string }) => {
        console.error("Authentication error:", message);
        // Handle auth errors through the auth provider
        if (message.includes("authentication failed")) {
          // Force clearance of cookies and tokens
          authListener.handleSpotifyError({ status: 401 });
        }
      }
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
  }, [isWebPlaybackReady, accessToken, spotifyPlayer, authError]);

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
