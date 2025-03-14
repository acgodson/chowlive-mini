import admin from "@/src/configs/firebase-admin-config";
import { z } from "zod";
import { baseProcedure } from "../../init";

export const fetchRoomUser = baseProcedure
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
  });
