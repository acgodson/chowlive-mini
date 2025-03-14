declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    spotifyWebPlayer?: Spotify.Player;
  }
}

declare global {
  interface Window {
    lukso?: LuksoProvider;
    ethereum?: LuksoProvider;
  }
}

export interface LuksoProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  accounts?: string[];
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
  isConnected?: () => boolean;
}

export {};
