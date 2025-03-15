"use client";

import React, { createContext, useContext, useState } from "react";
import Spotify from "spotify-web-api-js";

type SpotifyContextType = {
  spotify: Spotify.SpotifyWebApiJs;
};

const SpotifyContext = createContext<SpotifyContextType | null>(null);


export function SpotifyProvider({ children }: { children: React.ReactNode }) {
  const [spotify] = useState(() => new Spotify());
  return (
    <SpotifyContext.Provider value={{ spotify }}>
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify() {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error("useSpotify must be used within a SpotifyProvider");
  }
  return context;
}
