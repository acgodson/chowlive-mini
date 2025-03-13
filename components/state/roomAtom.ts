import { atom } from "jotai";

import Room from "@/components/models/Room";

export const ROOM_EMPTY: Room = {
  id: "",
  name: "",
  slug: "",
  nftId: 0,
  queuedSongs: [],
  owner_id: "",
  creator_id: "",
  users: [],
  messages: [],
  isPublic: true,
};

export const roomAtom = atom<Room>(ROOM_EMPTY);
