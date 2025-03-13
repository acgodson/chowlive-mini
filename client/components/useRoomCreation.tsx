import { trpc } from "@/trpc/client";
import { useState } from "react";

export function useRoomCreation() {
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [error, setError] = useState<null | any>(null);

  // Get the createRoom mutation from your TRPC router
  const createRoomMutation = trpc.createRoom.useMutation();

  // Placeholder function for LUKSO NFT minting
  const mintLuksoNFT = async (name: any, isPublic: any, price: any) => {
    console.log("Placeholder for minting LUKSO NFT", { name, isPublic, price });
    // This would eventually call your LUKSO blockchain code
    // For now, just return a dummy NFT ID
    return Math.floor(Math.random() * 10000) + 1; // Random ID between 1 and 10000
  };

  const createRoom = async ({ name, isPublic, price, creator_id }: any) => {
    setIsCreatingRoom(true);
    setError(null);

    try {
      // 1. Placeholder for LUKSO NFT minting
      const nftId = await mintLuksoNFT(name, isPublic, price);

      if (!nftId) {
        throw new Error("Failed to mint NFT");
      }

      console.log("NFT minted with ID:", nftId);

      // 2. Create room in Firestore using TRPC
      const room = await createRoomMutation.mutateAsync({
        name,
        nftId,
        isPublic,
        creator_id,
      });

      console.log("Room created in Firestore:", room);

      return room;
    } catch (err) {
      console.error("Error creating room:", err);
      setError("Failed to create room. Please try again.");
      return null;
    } finally {
      setIsCreatingRoom(false);
    }
  };

  return {
    createRoom,
    isCreatingRoom,
    error,
  };
}
