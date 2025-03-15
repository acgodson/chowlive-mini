import { useState, useCallback } from "react";
import { spotifyAuth } from "@/src/services/spotify/spotifyAuth";
import { useUpProvider } from "@/src/services/lukso/upProvider";
import { FIREBASE_CONFIG } from "@/src/configs/firebase-app-config";
import {useAuthListener} from "./useAuthListener";


const FIREBASE_PROJECT_ID = FIREBASE_CONFIG.projectId;

export function useSpotifyAuth() {
  const { provider } = useUpProvider();
  const { isAuthenticated, isLoading, clearAuthCookies } = useAuthListener();
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      console.log("[SpotifyAuth] Attempting to connect to Spotify");

      // Clear any existing tokens first to ensure a fresh connection
      clearAuthCookies();

      await spotifyAuth.connect({
        provider,
        firebaseProjectId: FIREBASE_PROJECT_ID,
      });

      // Connection successful, auth listener will pick up the new tokens
      console.log("[SpotifyAuth] Spotify connection successful");
    } catch (error) {
      console.error("[SpotifyAuth] Failed to connect Spotify:", error);
    } finally {
      setIsConnecting(true);
    }
  }, [provider, clearAuthCookies]);

  const disconnect = useCallback(() => {
    clearAuthCookies();
    console.log("[SpotifyAuth] Disconnected from Spotify");
  }, [clearAuthCookies]);

  return {
    isAuthenticated,
    isLoading: isLoading || isConnecting,
    connect,
    disconnect,
  };
}
