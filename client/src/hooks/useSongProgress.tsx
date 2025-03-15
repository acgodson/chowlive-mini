import { useState, useEffect, useRef } from "react";
import Song from "@/src/lib/models/Song";
import { calculateProgress } from "@/src/lib/playback/utils/calculateProgress";

const useSongProgress = (song?: Song) => {
  const [progress, setProgress] = useState(0);
  const lastProgressRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const songIdRef = useRef<string | null>(null);

  // Store last known progress when song changes or component unmounts
  useEffect(() => {
    // Cleanup previous interval when song changes or component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Handle song changes and progress tracking
  useEffect(() => {
    if (!song) {
      setProgress(0);
      return;
    }

    // If song ID changed, reset progress tracking
    if (songIdRef.current !== song.id) {
      songIdRef.current = song.id;

      // Initialize with current progress from song
      const initialProgress = calculateProgress(song);
      setProgress(initialProgress);
      lastProgressRef.current = initialProgress;

      console.log(
        `[useSongProgress] New song detected (${song.id}), initial progress: ${initialProgress}ms`
      );
    }

    // If song is paused, we should:
    // 1. Clear any running interval
    // 2. Keep the last known progress value
    if (song.isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Important: We do NOT reset progress to 0 here
      // Instead, use the stored progress from the song
      const pausedProgress = calculateProgress(song);

      // Only update if the progress has changed significantly
      if (Math.abs(pausedProgress - lastProgressRef.current) > 1000) {
        console.log(
          `[useSongProgress] Song paused, setting progress to: ${pausedProgress}ms`
        );
        setProgress(pausedProgress);
        lastProgressRef.current = pausedProgress;
      } else {
        console.log(
          `[useSongProgress] Song paused, maintaining progress at: ${lastProgressRef.current}ms`
        );
      }
    }
    // If song is playing, start interval to update progress
    else {
      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Get initial progress
      const initialProgress = calculateProgress(song);
      setProgress(initialProgress);
      lastProgressRef.current = initialProgress;

      console.log(
        `[useSongProgress] Song playing, starting progress tracking from: ${initialProgress}ms`
      );

      // Set up interval to update progress while playing
      intervalRef.current = setInterval(() => {
        const newProgress = calculateProgress(song);

        // Only update state if progress has changed significantly
        if (Math.abs(newProgress - lastProgressRef.current) > 500) {
          setProgress(newProgress);
          lastProgressRef.current = newProgress;
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [song, song?.isPaused]);

  return progress;
};

export default useSongProgress;
