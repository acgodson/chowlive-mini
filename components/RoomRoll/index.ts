import Room from "../models/Room";
import Song from "../models/Song";
import { SpotifyTrack } from "../services/spotify";

export const joinRoom = async (
  roomId: string,
  address: string
): Promise<boolean> => {
  // This would be a call to your backend/smart contract
  console.log(`User ${address} is joining room ${roomId}`);
  return true;
};
