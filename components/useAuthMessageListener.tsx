import { useEffect } from "react";

interface AuthMessageListenerProps {
  onAuthSuccess: (tokens: {
    firebaseToken: string;
    spotifyToken: string;
  }) => void;
}

export function useAuthMessageListener({
  onAuthSuccess,
}: AuthMessageListenerProps) {
  useEffect(() => {
    // Function to handle messages from popup window
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "SPOTIFY_AUTH_SUCCESS") {
        // Successfully authenticated with Spotify
        const { firebaseToken, spotifyToken } = event.data;

        // Store tokens in cookies
        if (firebaseToken) {
          document.cookie = `firebase_auth_token=${firebaseToken};path=/;max-age=2592000;samesite=none;secure`;
        }

        if (spotifyToken) {
          document.cookie = `spotify_token=${spotifyToken};path=/;max-age=2592000;samesite=none;secure`;
        }

        // Call the success callback
        onAuthSuccess({ firebaseToken, spotifyToken });
      }
    }

    // Add event listener for messages
    window.addEventListener("message", handleMessage);

    // Clean up
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [onAuthSuccess]);
}
