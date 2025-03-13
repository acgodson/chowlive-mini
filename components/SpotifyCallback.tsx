"use client";

import { useEffect, useState } from "react";
import { FIREBASE_CONFIG } from "@/configs/firebase-app-config";

export default function SpotifyCallback() {
  const [message, setMessage] = useState(
    "Processing Spotify authentication..."
  );

  useEffect(() => {
    const processAuth = async () => {
      try {
        // Get the URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");
        const error = urlParams.get("error");

        // Check for errors
        if (error) {
          setMessage(`Authentication failed: ${error}`);
          return;
        }

        // Verify state to prevent CSRF
        const storedState = getCookie("spotify_auth_state");
        if (state !== storedState) {
          setMessage("State mismatch. Authentication failed.");
          return;
        }

        if (!code) {
          setMessage("No authorization code received");
          return;
        }

        const firebaseProjectId = FIREBASE_CONFIG.projectId;

        // Exchange code for token via Firebase function
        const response = await fetch(
          `https://us-central1-${firebaseProjectId}.cloudfunctions.net/token?code=${encodeURIComponent(
            code
          )}&state=${encodeURIComponent(state as string)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          setMessage(`HTTP error! status: ${response.status}`);
          return;
        }

        const data = await response.json();

        if (data.token) {
          // Store Firebase token in cookie (accessible in iframe)
          document.cookie = `firebase_auth_token=${data.token};path=/;max-age=2592000;samesite=none;secure`;

          // Store Spotify token in cookie if available
          if (data.spotifyToken) {
            document.cookie = `spotify_token=${data.spotifyToken};path=/;max-age=2592000;samesite=none;secure`;
          }

          // Get redirect URLs from cookies
          const redirectUrl = getCookie("redirect_url") || "/";
          const parentUrl = getCookie("parent_url");

          // Notify parent window if it exists
          if (window.opener) {
            window.opener.postMessage(
              {
                type: "SPOTIFY_AUTH_SUCCESS",
                firebaseToken: data.token,
                spotifyToken: data.spotifyToken,
              },
              "*"
            );

            setMessage("Authentication successful! You can close this window.");

            // Close window after a short delay
            setTimeout(() => {
              window.close();
            }, 2000);
          } else {
            // If we're not in a popup, redirect based on context
            if (parentUrl && isFromGrid(parentUrl)) {
              // We were in a grid, notify the parent and redirect
              setMessage(
                "Authentication successful! Redirecting back to the Grid..."
              );

              // Create an invisible iframe to set cookies on the parent domain if needed
              if (new URL(parentUrl).origin !== window.location.origin) {
                const bridgeIframe = document.createElement("iframe");
                bridgeIframe.style.display = "none";
                bridgeIframe.src = `${
                  new URL(parentUrl).origin
                }/cookie-bridge.html?firebase_token=${encodeURIComponent(
                  data.token
                )}&spotify_token=${encodeURIComponent(
                  data.spotifyToken || ""
                )}`;
                document.body.appendChild(bridgeIframe);
              }

              setTimeout(() => {
                window.location.href = parentUrl;
              }, 2000);
            } else {
              // Standard redirect
              setMessage("Authentication successful! Redirecting...");
              setTimeout(() => {
                window.location.href = redirectUrl;
              }, 1000);
            }
          }
        } else {
          setMessage(
            `Failed to get authentication token: ${
              data.error || "Unknown error"
            }`
          );
        }
      } catch (error) {
        console.error("Error processing authentication:", error);
        setMessage("Failed to process authentication. Please try again.");
      }
    };

    processAuth();
  }, []);

  // Helper function to get cookie value
  function getCookie(name: any) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  // Helper function to check if URL is from a Grid
  function isFromGrid(url: string) {
    try {
      const parsedUrl = new URL(url);
      return (
        parsedUrl.hostname === "universaleverything.io" ||
        parsedUrl.pathname.includes("grid")
      );
    } catch {
      return false;
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md p-6 bg-gray-800 rounded-xl shadow-xl">
        <h1 className="text-2xl font-bold mb-4">Spotify Authentication</h1>
        <p className="text-gray-300">{message}</p>

        {/* Progress indicator */}
        <div className="mt-6">
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div className="bg-green-600 h-2.5 rounded-full animate-pulse w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
