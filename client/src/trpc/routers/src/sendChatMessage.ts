import { MessageType } from "@/src/lib/models/Message";
import { z } from "zod";
import { baseProcedure } from "../../init";
import admin from "@/src/configs/firebase-admin-config";

const db = admin.firestore();

export const sendChatMessage = baseProcedure
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
  });
