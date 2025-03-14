import Song from "@/src/lib/models/Song";
import { z } from "zod";
import { baseProcedure } from "../../init";
import admin from "@/src/configs/firebase-admin-config";

const db = admin.firestore();

export const updatePlayback = baseProcedure
  .input(
    z.object({
      songId: z.string().optional(),
      track: z
        .object({
          spotify_uri: z.string().nullable().optional(),
          duration_ms: z.number(),
        })
        .optional(),
      isPaused: z.boolean().optional(),
      shouldSkip: z.boolean().optional(),
      isSkipAtEnd: z.boolean().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { songId, track, isPaused, shouldSkip, isSkipAtEnd } = input;

    if (!songId) return;

    const songRef = db.collection("songs").doc(songId);
    const songSnap = await songRef.get();

    if (!songSnap.exists) {
      return;
    }

    const song = songSnap.data() as Song;

    if (!song || song.progress === undefined || song.progress === null) {
      return;
    }

    // CALCULATE PROGRESS
    const now = Date.now();
    const progress = now - song.updatedAt + song.progress;

    // SONG SKIPPING
    if (shouldSkip) {
      if (!track || song.spotifyUri !== track.spotify_uri) {
        return;
      }

      // If the client thinks the song is over but the server doesn't, don't skip
      if (isSkipAtEnd && track.duration_ms > progress) {
        return;
      }

      await songRef.delete();

      const nextSongsQuery = db
        .collection("songs")
        .where("roomId", "==", song.roomId)
        .where("addedAt", ">", song.addedAt);

      const nextSongsSnap = await nextSongsQuery.get();

      if (!nextSongsSnap.empty) {
        const nextSong = nextSongsSnap.docs[0];
        await db.collection("songs").doc(nextSong.id).update({
          updatedAt: new Date(),
          isPaused: false,
        });
      }

      return;
    }

    // PLAYBACK TOGGLING (PAUSE / PLAY)
    try {
      if (songId && isPaused !== undefined) {
        if (isPaused) {
          await songRef.update({
            isPaused,
            progress,
            updatedAt: new Date(),
          });
        } else {
          await songRef.update({
            isPaused,
            updatedAt: new Date(),
          });
        }
      }
    } catch (err) {
      console.log(err);
    }
  });
