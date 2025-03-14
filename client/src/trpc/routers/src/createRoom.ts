import { z } from "zod";
import { baseProcedure } from "../../init";
import { customAlphabet } from "nanoid";
import admin from "@/src/configs/firebase-admin-config";

const db = admin.firestore();

const generateSlug = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  10
);

export const createRoom = baseProcedure
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
      console.error("Error creating room in Firestore:", error);
      throw new Error(`Failed to create room: ${error.message}`);
    }
  });
