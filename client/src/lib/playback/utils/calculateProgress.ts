import Song from "../../models/Song";

export const calculateProgress = (
  song: Song,
  currentTime: number = Date.now()
): number => {
  if (!song) return 0;

  // Safety check - ensure we have necessary values
  if (!song.updatedAt) {
    console.log("[calculateProgress] Missing updatedAt timestamp");
    return song.progress || 0;
  }

  // Handle updatedAt based on its type
  let updatedAtMS: number;

  if (typeof song.updatedAt === "number") {
    // If it's already a number (milliseconds timestamp), use it directly
    updatedAtMS = song.updatedAt;
  } else if (typeof song.updatedAt === "string") {
    // If it's a string (ISO date), convert it
    updatedAtMS = new Date(song.updatedAt).getTime();
  } else if (typeof song.updatedAt === "object") {
    // It's a Firestore timestamp object
    if (song.updatedAt.toMillis) {
      // If toMillis method exists, use it
      updatedAtMS = song.updatedAt.toMillis();
    } else if (song.updatedAt.toDate) {
      // If toDate method exists, use it
      updatedAtMS = song.updatedAt.toDate().getTime();
    } else if ("seconds" in song.updatedAt) {
      // Fallback to seconds * 1000 if other methods not available
      updatedAtMS = song.updatedAt.seconds * 1000;
    } else {
      // If it's some other object, log and return current progress
      console.log(
        "[calculateProgress] Unknown updatedAt object format:",
        song.updatedAt
      );
      return song.progress || 0;
    }
  } else {
    // For any other type, return current progress
    console.log(
      "[calculateProgress] Unknown updatedAt format:",
      song.updatedAt
    );
    return song.progress || 0;
  }

  // Ensure we have a valid progress value
  let progress = typeof song.progress === "number" ? song.progress : 0;

  // Only calculate elapsed time if the song is playing
  if (!song.isPaused) {
    const elapsedTime = currentTime - updatedAtMS;
    if (elapsedTime > 0) {
      progress += elapsedTime;
    }
  }

  // Ensure the progress doesn't exceed the song duration
  if (song.duration_ms && song.duration_ms > 0) {
    return Math.min(Math.max(progress, 0), song.duration_ms);
  } else {
    return Math.max(progress, 0);
  }
};
