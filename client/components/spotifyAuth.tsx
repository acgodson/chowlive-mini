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
   * Initiates Spotify authentication via popup window
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

      // Store iframe URL for redirect back
      document.cookie = `redirect_url=${window.location.href};path=/;max-age=3600;samesite=none;secure`;

      // Try to get the parent Grid URL from referrer
      const gridUrl =
        document.referrer ||
        window.parent?.location?.href ||
        window.location.href;
      document.cookie = `parent_url=${gridUrl};path=/;max-age=3600;samesite=none;secure`;

      // Construct redirect URL to Firebase function
      const spotifyAuthUrl = `https://us-central1-${firebaseProjectId}.cloudfunctions.net/redirect?state=${encodeURIComponent(
        state
      )}&origin=${encodeURIComponent(window.location.origin)}`;

      // Open in a new popup window instead of redirecting
      const width = 500;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;

      const popup = window.open(
        spotifyAuthUrl,
        "spotify-auth-popup",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        // If popup was blocked, fallback to redirect
        console.warn("Popup was blocked. Falling back to redirect...");

        // Before redirecting, try to store info in localStorage as a backup
        try {
          localStorage.setItem("spotify_auth_from_grid", "true");
          localStorage.setItem("spotify_auth_grid_url", gridUrl);
        } catch (e) {
          console.warn("Could not access localStorage", e);
        }

        window.location.href = spotifyAuthUrl;
        return;
      }

      // Set up message listener to receive authentication data
      const messageListener = (event: MessageEvent) => {
        if (
          event.data &&
          event.data.type === "SPOTIFY_AUTH_SUCCESS" &&
          event.data.firebaseToken
        ) {
          // Store tokens
          document.cookie = `firebase_auth_token=${event.data.firebaseToken};path=/;max-age=2592000;samesite=none;secure`;

          if (event.data.spotifyToken) {
            document.cookie = `spotify_token=${event.data.spotifyToken};path=/;max-age=2592000;samesite=none;secure`;
          }

          // Clean up
          window.removeEventListener("message", messageListener);

          // Refresh the current page to reflect authenticated state
          window.location.reload();
        }
      };

      window.addEventListener("message", messageListener);
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
    console.log(provider);
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
        const parentUrl = getCookie("parent_url");

        // Clear auth state cookie
        document.cookie =
          "spotify_auth_state=;path=/;max-age=0;samesite=none;secure";

        // If we're in a popup, send message to opener
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "SPOTIFY_AUTH_SUCCESS",
              firebaseToken: data.token,
              spotifyToken: data.spotifyToken,
            },
            "*"
          );
          return true;
        } else {
          // Check localStorage as backup if we came from Grid
          let isFromGrid = false;
          let gridUrl = parentUrl;

          try {
            isFromGrid =
              localStorage.getItem("spotify_auth_from_grid") === "true";
            if (isFromGrid && !gridUrl) {
              gridUrl = localStorage.getItem("spotify_auth_grid_url");
            }
            // Clean up localStorage
            localStorage.removeItem("spotify_auth_from_grid");
            localStorage.removeItem("spotify_auth_grid_url");
          } catch (e) {
            console.warn("Could not access localStorage", e);
          }

          // Redirect back to the appropriate URL
          window.location.href = gridUrl || redirectUrl;
          return true;
        }
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
