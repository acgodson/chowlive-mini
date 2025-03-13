interface Song {
  id: string;
  spotifyUri?: string;
  progress: number;
  isPaused: boolean;
  updatedAt: number;
  addedAt: number;
  roomId: string;
  duration_ms: number;
}

export default Song;
