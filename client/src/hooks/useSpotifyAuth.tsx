import { useState, useEffect } from "react";
import { spotifyAuth } from "@/src/services/spotify/spotifyAuth";
import { useUpProvider } from "@/src/services/lukso/upProvider";
import { FIREBASE_CONFIG } from "@/src/configs/firebase-app-config";
// import { useAuthMessageListener } from "./useAuthMessageListener";
import { signInWithCustomToken } from "firebase/auth";
import { getFirebaseAuth } from "../configs/firebase-app-config";

// Firebase project ID
const FIREBASE_PROJECT_ID = FIREBASE_CONFIG.projectId;

export function useSpotifyAuth() {
  const { provider } = useUpProvider();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getFirebaseAuth();

  useEffect(() => {
    const checkExistingAuth = () => {
      // Check for firebase token in cookies
      const firebaseToken = getCookie("firebase_auth_token");

      if (firebaseToken) {
        // If token exists, try to authenticate with Firebase
        signInWithCustomToken(auth, firebaseToken)
          .then(() => {
            setIsAuthenticated(true);
          })
          .catch((error) => {
            console.error("Error signing in with token:", error);
            // Token might be invalid or expired, clear it
            document.cookie =
              "firebase_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; samesite=none; secure";
            document.cookie =
              "spotify_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; samesite=none; secure";
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    };

    // Also listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
    });

    checkExistingAuth();

    // Cleanup
    return () => unsubscribe();
  }, []);

  // const handleAuthSuccess = useCallback(
  //   ({ firebaseToken, spotifyToken }: any) => {
  //     if (firebaseToken && spotifyToken) {
  //       setIsAuthenticated(true);
  //     }
  //   },
  //   []
  // );

  const connect = async () => {
    try {
      setIsLoading(true);
      console.log("attempting to connect to spotify");
      await spotifyAuth.connect({
        provider,
        firebaseProjectId: FIREBASE_PROJECT_ID,
      });
    } catch (error) {
      console.error("Failed to connect Spotify:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    document.cookie =
      "firebase_auth_token=;path=/;max-age=0;samesite=none;secure";
    document.cookie = "spotify_token=;path=/;max-age=0;samesite=none;secure";
    setIsAuthenticated(false);
  };

  function getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  return {
    isAuthenticated,
    isLoading,
    connect,
    disconnect,
    getSpotifyToken: spotifyAuth.getSpotifyToken,
    getFirebaseAuthToken: spotifyAuth.getFirebaseAuthToken,
  };
}
