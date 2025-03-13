import Song from "@/components/models/Song";


export const calculateProgress = (song?: Song) => {
  if (!song) return 0;

  const x = new Date();
  const updatedAtMS = song ? new Date(song.updatedAt).getTime() : 0; // Convert to milliseconds

  // Get current time in milliseconds
  let now = x.getTime();
  if (now - updatedAtMS > 10000000) now -= x.getTimezoneOffset() * 60 * 1000;
  if (now - updatedAtMS < -10000000) now += x.getTimezoneOffset() * 60 * 1000;

  const progress = now - updatedAtMS + song.progress;

  if (song.isPaused) return song.progress;
  return progress;
};
