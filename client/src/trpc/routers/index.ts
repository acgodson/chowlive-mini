import { createTRPCRouter } from "../init";
import { createRoom } from "./src/createRoom";
import { fetchRoomUser } from "./src/fetchRoomUser";
import { queueSong } from "./src/queueSong";
import { updatePlayback } from "./src/updatePlayback";
import { fetchRoomsByNftIds } from "./src/fetchRoomsByNftIds";
import { fetchAllRooms } from "./src/fetchAllRooms";
import { sendChatMessage } from "./src/sendChatMessage";

export const appRouter = createTRPCRouter({
  createRoom,
  fetchRoomUser,
  queueSong,
  updatePlayback,
  sendChatMessage,
  fetchAllRooms,
  fetchRoomsByNftIds,
});

export type AppRouter = typeof appRouter;
