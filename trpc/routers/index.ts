import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { customAlphabet } from "nanoid";
import { MessageType } from "@/components/models/Message";
import Song from "@/components/models/Song";
import admin from "@/configs/firebase-admin-config";

const db = admin.firestore();

const generateSlug = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  10
);

export const appRouter = createTRPCRouter({
  createRoom: baseProcedure
    .input(
      z.object({
        name: z.string(),
        nftId: z.number(),
        isPublic: z.boolean(),
        creator_id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      console.log("sent");
      try {
        const room = {
          name: input.name,
          nftId: input.nftId,
          isPublic: input.isPublic,
          creator_id: input.creator_id,
          slug: generateSlug(),
        };

        const docRef = await db.collection("rooms").add(room);

        if (docRef.id) return { ...room, id: docRef.id };
        return null;
      } catch (error: any) {
        // Properly handle and log the error
        console.error("Error creating room in Firestore:", error);
        throw new Error(`Failed to create room: ${error.message}`);
      }
    }),

  fetchRoomUser: baseProcedure
    .input(
      z.object({
        userIds: z.array(z.string()),
      })
    )
    .query(async ({ input }) => {
      const userPromises = input.userIds.map(async (userId) => {
        try {
          const user = await admin.auth().getUser(userId);
          return [
            userId,
            {
              displayName: user.displayName || null,
              photoURL: user.photoURL || null,
            },
          ];
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
          return [userId, { displayName: null, photoURL: null }];
        }
      });
      const users = await Promise.all(userPromises);
      return Object.fromEntries(users);
    }),

  queueSong: baseProcedure
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
    }),

  updatePlayback: baseProcedure
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
    }),

  sendChatMessage: baseProcedure
    .input(
      z.object({
        type: z.literal(MessageType.UserChat),
        content: z.string(),
        roomId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await db.collection("messages").add({
        ...input,
        timestamp: new Date(),
      });
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
