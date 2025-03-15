interface Song {
  id: string;
  spotifyUri?: string;
  progress: number;
  isPaused: boolean;
  updatedAt: number | string | FirestoreTimestamp;
  addedAt: number;
  roomId: string;
  duration_ms: number;
}

interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
  toMillis?: () => number;
}

export default Song;
