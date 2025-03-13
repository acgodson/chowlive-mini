export interface SpotifyTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
  }
  
  export interface SpotifyTrack {
    id: string;
    name: string;
    artists: { name: string }[];
    album: {
      name: string;
      images: { url: string }[];
    };
    uri: string;
  }
  
  // This would typically be an API route in Next.js that proxies requests to Spotify
  export const getSpotifyAuthUrl = (redirectUri: string, state?: string) => {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const scope = 'user-read-private user-read-email user-read-playback-state user-modify-playback-state';
    
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('client_id', clientId || '');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scope);
    
    if (state) {
      authUrl.searchParams.append('state', state);
    }
    
    return authUrl.toString();
  };