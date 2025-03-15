import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { onAuthStateChanged, signInWithCustomToken, User } from "firebase/auth";
import { getDatabase, get, ref } from "firebase/database";
import { getFirebaseAuth } from "../configs/firebase-app-config";

type AuthContextType = {
  user: User | null;
  spotifyToken: string | null;
  authError: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  handleSpotifyError: (error: any) => boolean;
  clearAuthCookies: () => void;
  forceAuthRefresh: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Use a ref to track error handling to prevent infinite loops
  const errorHandlingRef = useRef(false);
  const lastErrorTimeRef = useRef(0);

  // Function to get cookie value
  const getCookie = useCallback((name: string): string | null => {
    if (typeof document === "undefined") return null;

    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      const c = ca[i].trim();
      if (c.startsWith(nameEQ)) return c.substring(nameEQ.length);
    }
    return null;
  }, []);

  // Function to delete all auth cookies
  const clearAuthCookies = useCallback(() => {
    if (typeof document === "undefined" || errorHandlingRef.current) return;

    try {
      document.cookie =
        "firebase_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; samesite=none; secure";
      document.cookie =
        "spotify_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; samesite=none; secure";

      // Also clear state
      setSpotifyToken(null);
      setAuthError(true);

      console.log("[AuthListener] Cleared auth cookies due to error");
    } catch (e) {
      console.error("[AuthListener] Error clearing cookies:", e);
    }
  }, []);

  // Function to force a refresh of the auth state
  const forceAuthRefresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1);
    console.log("[AuthListener] Forcing auth refresh");
  }, []);

  // Function to fetch Spotify token
  const fetchSpotifyToken = useCallback(
    async (uid: string | null) => {
      if (!uid) return null;

      try {
        const spotifyTokenFromCookie = getCookie("spotify_token");
        if (spotifyTokenFromCookie) {
          setSpotifyToken(spotifyTokenFromCookie);
          return spotifyTokenFromCookie;
        }

        const rtdb = getDatabase();
        const tokenSnapshot = await get(ref(rtdb, `spotifyAccessToken/${uid}`));
        const accessToken = tokenSnapshot.val();

        if (accessToken) {
          document.cookie = `spotify_token=${accessToken};path=/;max-age=2592000;samesite=none;secure`;
          setSpotifyToken(accessToken);
          return accessToken;
        } else {
          setAuthError(true);
          return null;
        }
      } catch (error) {
        console.error("[AuthListener] Error fetching Spotify token:", error);
        setAuthError(true);
        return null;
      }
    },
    [getCookie]
  );

  useEffect(() => {
    const auth = getFirebaseAuth();
    setIsLoading(true);

    const handleAuthChange = async (authUser: User | null) => {
      if (authUser) {
        setUser(authUser);
        const token = await fetchSpotifyToken(authUser.uid);
        if (!token) {
          setAuthError(true);
        } else {
          setAuthError(false);
        }
      } else {
        setUser(null);
        setSpotifyToken(null);
        setAuthError(true);
      }
      setIsLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        handleAuthChange(authUser);
      } else {
        const firebaseToken = getCookie("firebase_auth_token");
        if (firebaseToken) {
          try {
            const userCredential = await signInWithCustomToken(
              auth,
              firebaseToken
            );
            handleAuthChange(userCredential.user);
          } catch (error) {
            console.error("[AuthListener] Error signing in with token:", error);
            clearAuthCookies();
            setAuthError(true);
            setIsLoading(false);
          }
        } else {
          handleAuthChange(null);
        }
      }
    });

    return () => unsubscribe();
  }, [fetchSpotifyToken, getCookie, clearAuthCookies, refreshCounter]);

  // Method to handle Spotify API errors from other hooks
  const handleSpotifyError = useCallback(
    (error: any) => {
      // Rate limit error handling
      const now = Date.now();
      if (now - lastErrorTimeRef.current < 5000) {
        console.log("[AuthListener] Throttling error handling");
        return false;
      }

      lastErrorTimeRef.current = now;

      // Prevent recursive error handling
      if (errorHandlingRef.current) {
        console.log("[AuthListener] Already handling an error, skipping");
        return false;
      }

      // Check if it's an auth error (401)
      if (error?.status === 401) {
        try {
          errorHandlingRef.current = true;
          console.log(
            "[AuthListener] Handling Spotify 401 error, clearing auth state"
          );
          setAuthError(true);
          clearAuthCookies();
          setSpotifyToken(null);

          // Release the lock after a delay
          setTimeout(() => {
            errorHandlingRef.current = false;
          }, 1000);

          return true;
        } catch (e) {
          console.error("[AuthListener] Error while handling auth error:", e);
          errorHandlingRef.current = false;
          return false;
        }
      }
      return false;
    },
    [clearAuthCookies]
  );

  const value = {
    user,
    spotifyToken,
    authError,
    isLoading,
    isAuthenticated: !!user && !!spotifyToken && !authError,
    handleSpotifyError,
    clearAuthCookies,
    forceAuthRefresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthListener = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthListener must be used within an AuthProvider");
  }
  return context;
};
