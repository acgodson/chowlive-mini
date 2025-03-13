"use client";

import React, { useState, useEffect } from "react";
import { useUpProvider } from "../upProvider";
import { useSpotifyAuth } from "../useSpotifyAuth";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";

interface HomeProps {
  onJoinRoom: (roomId: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onJoinRoom }) => {
  const router = useRouter();
  const { accounts } = useUpProvider();
  const [roomIdInput, setRoomIdInput] = useState("");
  const [showRoomIdFromUrl, setShowRoomIdFromUrl] = useState(false);
  const [roomIdFromUrl, setRoomIdFromUrl] = useState("");
  const { isAuthenticated, isLoading, connect } = useSpotifyAuth();

  // Room creation states
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Get the createRoom mutation from your TRPC router
  const { mutateAsync: createRoom } = trpc.createRoom.useMutation();

  useEffect(() => {
    // CSS for backdrop-filter
    const style = document.createElement("style");
    style.textContent = `
      .glossy-input {
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
    `;
    document.head.appendChild(style);

    // Check URL for room ID
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const roomIdParam = urlParams.get("roomId");
      if (roomIdParam) {
        setRoomIdFromUrl(roomIdParam);
        setShowRoomIdFromUrl(true);
      }
    }

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleJoinRoom = () => {
    const idToUse = showRoomIdFromUrl ? roomIdFromUrl : roomIdInput.trim();
    if (idToUse) {
      onJoinRoom(idToUse);
    }
  };

  // Placeholder function for LUKSO NFT minting
  const mintLuksoNFT = async (name: string, isPublic: boolean) => {
    console.log("Placeholder for minting LUKSO NFT", { name, isPublic });
    
    return Math.floor(Math.random() * 10000) + 1; // Random ID between 1 and 10000
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError("Please enter a room name");
      return;
    }

    setIsCreatingRoom(true);
    setError(null);

    try {
      console.log("Creating room with params:", {
        name: roomName,
        nftId: (await mintLuksoNFT(roomName, isPublic)) ?? 1,
        isPublic: true,
        creator_id: accounts[0],
      });

      // 1. Placeholder for LUKSO NFT minting
      const nftId = await mintLuksoNFT(roomName, isPublic);

      if (!nftId) {
        throw new Error("Failed to mint NFT");
      }

      // 2. Create room in Firestore using TRPC
      const room = await createRoom({
        name: roomName,
        nftId: Number(nftId),
        isPublic: isPublic,
        creator_id: accounts[0],
      });

      console.log("Room created:", room);

      if (room && room.slug) {
        router.push(`/rooms/${room.slug}`);
      }
    } catch (err: any) {
      console.error("Error creating room:", err);
      setError(`Failed to create room: ${err.message}`);
    } finally {
      setIsCreatingRoom(false);
      setShowCreateForm(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 h-full flex flex-col">
      <div className="overflow-hidden rounded-2xl shadow-xl flex-grow flex flex-col max-h-[95vh]">
        {/* Background Image - Reduced height */}
        <div
          className="relative"
          style={{ maxHeight: "30vh", minHeight: "100px" }}
        >
          <div
            className="absolute inset-0 z-0 bg-cover bg-top"
            style={{
              backgroundImage: isAuthenticated
                ? `url('/mc/Chowlive_Character(13).png')`
                : `url('/mc/Chowlive_Character(11).png')`,
              filter: "brightness(0.6)",
            }}
          ></div>

          {/* Header Content */}
          <div className="relative z-10 px-6 py-4">
            <img src="/brand_logo.png" alt="brand" style={{ height: "45px" }} />
          </div>
        </div>

        {/* Card Body - Dark Theme with Scrollable Container */}
        <div className="bg-gray-900/90 backdrop-blur-sm p-6 flex-grow overflow-y-auto">
          {/* Content Container */}
          <div className="flex flex-col space-y-4">
            {/* Spotify Connection Section */}
            {!isAuthenticated && (
              <div className="mb-2">
                <h2 className="text-xl font-semibold mb-2 text-white">
                  Connect Your Spotify
                </h2>
                <p className="text-sm mb-4 text-gray-300">
                  Join or create a room to listen to music with friends
                </p>
                <button
                  className="w-full bg-green-600/80 hover:bg-green-700/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg font-medium transition duration-200 flex items-center justify-center"
                  disabled={isLoading}
                  onClick={connect}
                >
                  <svg
                    className="w-6 h-6 mr-2"
                    viewBox="0 0 24 24"
                    fill="white"
                  >
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  {isLoading ? "Connecting..." : "Connect Spotify"}
                </button>
              </div>
            )}

            {/* Room Actions - Only shown if Spotify is connected */}
            {isAuthenticated && !showCreateForm && (
              <div className="space-y-4">
                {/* Join Room Section */}
                {!showRoomIdFromUrl && (
                  <>
                    <div>
                      <label
                        htmlFor="roomId"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Room ID
                      </label>
                      <input
                        id="roomId"
                        type="text"
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 bg-gray-800/70 backdrop-blur-sm text-white"
                        placeholder="Enter room ID"
                      />
                    </div>
                    <button
                      className="w-full bg-blue-600/80 hover:bg-blue-700/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                      onClick={handleJoinRoom}
                      disabled={!roomIdInput.trim()}
                    >
                      Join Room
                    </button>

                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-gray-700"></div>
                      <span className="flex-shrink mx-4 text-gray-500">or</span>
                      <div className="flex-grow border-t border-gray-700"></div>
                    </div>

                    <button
                      className="w-full bg-gray-700/80 hover:bg-gray-600/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                      onClick={() => setShowCreateForm(true)}
                    >
                      Create New Room
                    </button>
                  </>
                )}

                {/* If room ID is in URL, show only join button */}
                {showRoomIdFromUrl && (
                  <button
                    className="w-full bg-blue-600/80 hover:bg-blue-700/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                    onClick={handleJoinRoom}
                  >
                    Join Room
                  </button>
                )}
              </div>
            )}

            {/* Create Room Form */}
            {isAuthenticated && showCreateForm && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-2 text-white">
                  Create New Room
                </h2>

                <div>
                  <label
                    htmlFor="roomName"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Room Name
                  </label>
                  <input
                    id="roomName"
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 bg-gray-800 text-white"
                    placeholder="Enter room name"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                    />
                    <span className="ml-2 text-white">Public</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                    />
                    <span className="ml-2 text-white">Private</span>
                  </label>
                </div>

                {error && <div className="text-red-500 text-sm">{error}</div>}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    className="flex-1 bg-gray-700/80 hover:bg-gray-600/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex-1 bg-blue-600/80 hover:bg-blue-700/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                    onClick={handleCreateRoom}
                    disabled={isCreatingRoom || !roomName.trim()}
                  >
                    {isCreatingRoom ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
