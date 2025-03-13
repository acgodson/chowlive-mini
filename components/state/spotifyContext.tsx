"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Spotify from "spotify-web-api-js";

// Create a type for the context
type SpotifyContextType = {
  spotify: Spotify.SpotifyWebApiJs;
};

// Create the context with a default value
const SpotifyContext = createContext<SpotifyContextType | null>(null);

// Create a provider component
export function SpotifyProvider({ children }: { children: React.ReactNode }) {
  const [spotify] = useState(() => new Spotify());

  return (
    <SpotifyContext.Provider value={{ spotify }}>
      {children}
    </SpotifyContext.Provider>
  );
}

// Create a hook to use the context
export function useSpotify() {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error("useSpotify must be used within a SpotifyProvider");
  }
  return context;
}
