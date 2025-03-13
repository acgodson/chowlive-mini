"use client";

import { useEffect, useState } from "react";
import { FIREBASE_CONFIG } from "@/configs/firebase-app-config";

export default function SpotifyCallback() {
  const [message, setMessage] = useState(
    "Processing Spotify authentication..."
  );
  const [isComplete, setIsComplete] = useState(false);
  const [isFromGrid, setIsFromGrid] = useState(false);
  const [gridUrl, setGridUrl] = useState("");

  useEffect(() => {
    const processAuth = async () => {
      try {
        const currentOrigin = window.location.origin;
        const redirectUri = `${currentOrigin}/spotify-callback`;

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
          `https://us-central1-${firebaseProjectId}.cloudfunctions.net/token?code=${code}&state=${state}&redirect_uri=${encodeURIComponent(
            redirectUri
          )}`,
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

          // Check if we came from a grid
          const fromGrid = checkIfFromGrid(parentUrl || redirectUrl);
          setIsFromGrid(fromGrid);

          if (fromGrid) {
            setGridUrl(parentUrl || redirectUrl);
          }

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

            setMessage("Authentication successful!");
            setIsComplete(true);

            // Don't auto-close, let user choose
          } else {
            // If we're not in a popup, set as complete and let user choose
            setMessage("Authentication successful!");
            setIsComplete(true);

            // Don't auto-redirect, let user choose
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

  // Handle return to grid or close window
  const handleReturn = () => {
    if (window.opener) {
      window.close();
    } else if (gridUrl) {
      window.location.href = gridUrl;
    } else {
      const redirectUrl = getCookie("redirect_url") || "/";
      window.location.href = redirectUrl;
    }
  };

  // Helper function to get cookie value
  function getCookie(name: string) {
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
  function checkIfFromGrid(url: string) {
    if (!url) return false;

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
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: `url('/mc/Chowlive_Character(13).png')`,
        backgroundColor: "rgba(17, 24, 39, 0.92)",
        backgroundBlendMode: "overlay",
      }}
    >
      <div className="w-full max-w-md p-8 backdrop-blur-md bg-gray-900/70 rounded-xl shadow-2xl border border-gray-800">
        <div className="text-center">
          <img
            src="/brand_logo.png"
            alt="ChowLive"
            className="h-10 mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold mb-4 text-white">
            Spotify Authentication
          </h1>

          {isComplete ? (
            <>
              <div className="rounded-full bg-green-600/20 p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-xl text-white mb-2">{message}</p>
              <p className="text-sm text-gray-300 mb-6">
                {isFromGrid
                  ? "Return to the Grid to continue"
                  : "You can now close this window"}
              </p>
              <button
                onClick={handleReturn}
                className="w-full py-3 px-4 rounded-lg text-white font-medium transition-all duration-200 bg-green-600/80 hover:bg-green-700/90 backdrop-blur-sm"
              >
                {isFromGrid
                  ? "Return to Grid"
                  : window.opener
                  ? "Close Window"
                  : "Continue"}
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-300 mb-6">{message}</p>
              {/* Progress indicator */}
              <div className="w-full bg-gray-800 rounded-full h-2 mb-6">
                <div className="bg-green-600 h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-75"></div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-150"></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
