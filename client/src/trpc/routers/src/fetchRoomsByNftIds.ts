import { z } from "zod";
import admin from "@/src/configs/firebase-admin-config";
import { baseProcedure } from "../../init";


const db = admin.firestore();

export const fetchRoomsByNftIds = baseProcedure
  .input(
    z.object({
      nftIds: z.array(z.number()),
    })
  )
  .mutation(async ({ input }) => {
    try {
      if (input.nftIds.length === 0) {
        return [];
      }
      const roomsSnapshot = await db
        .collection("rooms")
        .where("nftId", "in", input.nftIds)
        .get();

      if (roomsSnapshot.empty) {
        return [];
      }

      return roomsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching rooms by NFT IDs:", error);
      throw new Error("Failed to fetch rooms by NFT IDs");
    }
  });
