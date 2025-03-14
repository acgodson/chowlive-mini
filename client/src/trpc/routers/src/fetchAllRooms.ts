import { baseProcedure } from "../../init";

import admin from "@/src/configs/firebase-admin-config";

const db = admin.firestore();

export const fetchAllRooms = baseProcedure.mutation(async () => {
  try {
    const roomsSnapshot = await db.collection("rooms").get();

    if (roomsSnapshot.empty) {
      return [];
    }
    return roomsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching all rooms:", error);
    throw new Error("Failed to fetch rooms");
  }
});
