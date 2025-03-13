import { UPClientProvider } from "@lukso/up-provider";

interface SpotifyAuthProps {
  provider: UPClientProvider | null;
  firebaseProjectId: string;
}

/**
 * Handles Spotify authentication within a LUKSO Grid (iframe) environment
 */
export const spotifyAuth = {
  /**
   * Initiates Spotify authentication via redirect
   * @param provider LUKSO UP Provider
   * @param firebaseProjectId Firebase project ID for cloud functions
   */
  async connect({ provider, firebaseProjectId }: SpotifyAuthProps) {
    try {
      // Generate state for security
      const randomString = Math.random().toString(36).substring(2, 15);
      const state = randomString.padEnd(20, "0").substring(0, 20);

      // Store state in cookie (accessible in iframe)
      document.cookie = `spotify_auth_state=${state};path=/;max-age=3600;samesite=none;secure`;

      // Store UP address if available
      if (provider && provider.accounts && provider.accounts[0]) {
        document.cookie = `spotify_auth_address=${provider.accounts[0]};path=/;max-age=3600;samesite=none;secure`;
      }

      // Store current URL for redirect back
      document.cookie = `redirect_url=${window.location.href};path=/;max-age=3600;samesite=none;secure`;

      // Construct redirect URL to Firebase function
      const spotifyAuthUrl = `https://us-central1-${firebaseProjectId}.cloudfunctions.net/redirect?state=${encodeURIComponent(
        state
      )}&origin=${encodeURIComponent(window.location.origin)}`;

      // Use top-level navigation (parent window) to avoid iframe restrictions
      //@ts-ignore
      window.top.location.href = spotifyAuthUrl;
    } catch (error) {
      console.error("Error initiating Spotify auth:", error);
      throw error;
    }
  },

  /**
   * Processes the callback from Spotify OAuth
   * @param provider LUKSO UP Provider
   * @param firebaseProjectId Firebase project ID for cloud functions
   */
  async processCallback({ provider, firebaseProjectId }: SpotifyAuthProps) {
    try {
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      const error = urlParams.get("error");

      // Check for errors
      if (error) {
        throw new Error(`Authentication failed: ${error}`);
      }

      if (!code || !state) {
        throw new Error("Missing code or state parameter");
      }

      // Get stored state from cookie
      const storedState = getCookie("spotify_auth_state");
      if (state !== storedState) {
        throw new Error("State mismatch. Authentication failed.");
      }

      // Exchange code for token using Firebase function
      const response = await fetch(
        `https://us-central1-${firebaseProjectId}.cloudfunctions.net/token?code=${encodeURIComponent(
          code
        )}&state=${encodeURIComponent(state)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.token) {
        // Store Firebase token in cookie (accessible in iframe)
        document.cookie = `firebase_auth_token=${data.token};path=/;max-age=2592000;samesite=none;secure`;

        // Store Spotify token in cookie if available
        if (data.spotifyToken) {
          document.cookie = `spotify_token=${data.spotifyToken};path=/;max-age=2592000;samesite=none;secure`;
        }

        // Get redirect URL from cookie
        const redirectUrl = getCookie("redirect_url") || "/";

        // Clear auth state cookie
        document.cookie =
          "spotify_auth_state=;path=/;max-age=0;samesite=none;secure";

        // Redirect back to the original page
        window.location.href = redirectUrl;
        return true;
      } else {
        throw new Error(data.error || "Failed to get authentication token");
      }
    } catch (error) {
      console.error("Error processing callback:", error);
      throw error;
    }
  },

  /**
   * Checks if the user is authenticated with Spotify
   */
  isAuthenticated() {
    return !!getCookie("firebase_auth_token") && !!getCookie("spotify_token");
  },

  /**
   * Gets the Firebase auth token
   */
  getFirebaseAuthToken() {
    return getCookie("firebase_auth_token");
  },

  /**
   * Gets the Spotify token
   */
  getSpotifyToken() {
    return getCookie("spotify_token");
  },

  /**
   * Signs out the user
   */
  signOut() {
    document.cookie =
      "firebase_auth_token=;path=/;max-age=0;samesite=none;secure";
    document.cookie = "spotify_token=;path=/;max-age=0;samesite=none;secure";
  },
};

/**
 * Helper function to get cookie value by name
 */
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
