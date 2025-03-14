import { z } from "zod";
import admin from "@/src/configs/firebase-admin-config";
import { baseProcedure } from "../../init";
import Song from "@/src/lib/models/Song";

const db = admin.firestore();

export const queueSong = baseProcedure
  .input(
    z.object({
      spotifyUri: z.string().optional(),
      roomId: z.string().optional(),
      progress: z.number().optional(),
      duration_ms: z.number().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { roomId, spotifyUri, progress, duration_ms } = input;

    if (roomId && spotifyUri && duration_ms) {
      const songsRef = db.collection("songs");
      const q = songsRef.where("roomId", "==", roomId);
      const querySnapshot = await q.get();
      const hasCurrentSong = !querySnapshot.empty;

      const now = Date.now();
      const song: Partial<Song> = {
        spotifyUri: spotifyUri || undefined,
        progress: progress || 0,
        isPaused: hasCurrentSong,
        roomId: roomId,
        duration_ms: duration_ms,
        addedAt: now,
        updatedAt: now,
      };

      const docRef = await db.collection("songs").add(song);
      if (docRef.id) {
        return {
          roomId: roomId,
          song_id: docRef.id,
        };
      }
    }
  });
