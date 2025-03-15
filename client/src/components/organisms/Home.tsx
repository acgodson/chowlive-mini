"use client";

import React, { useState, useEffect } from "react";

import { useSpotifyAuth } from "@/src/hooks/useSpotifyAuth";
import { FaAsterisk } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { trpc } from "@/src/trpc/client";
import LuksoRpc from "@/src/services/lukso";
import { useUpProvider } from "@/src/services/lukso/upProvider";

interface Room {
  id: string;
  name: string;
  nftId: number;
  isPublic: boolean;
  creator_id: string;
  slug: string;
}

export const Home: React.FC = () => {
  const router = useRouter();
  const { accounts, provider } = useUpProvider();
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

  // Switcher states
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [myRooms, setMyRooms] = useState<Room[] | any>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // Get the createRoom mutation from your TRPC router
  const { mutateAsync: createRoom } = trpc.createRoom.useMutation();

  // We'll use Firebase Admin query via fetchAllRooms or similar endpoint
  const { mutateAsync: fetchAllRooms } = trpc.fetchAllRooms?.useMutation();

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

  const handleJoinRoom = (roomIdToJoin?: string) => {
    const idToUse =
      roomIdToJoin || (showRoomIdFromUrl ? roomIdFromUrl : roomIdInput.trim());
    if (idToUse) {
      router.push(`/rooms/${idToUse}`);
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError("Please enter a room name");
      return;
    }

    if (!isAuthenticated || !provider?.accounts[0] || !provider) {
      setError("Please connect spotify and UP");
      return;
    }

    setIsCreatingRoom(true);
    setError(null);

    try {
      // Create LuksoRpc instance
      const luksoRpc = new LuksoRpc(provider);

      console.log("Creating room with params:", {
        name: roomName,
        isPublic: isPublic,
        subscriptionFee: !isPublic ? "0" : "0",
      });

      const { hash, roomId } = await luksoRpc.createRoom(isPublic, 0);

      console.log("Room created, transaction hash:", hash);
      console.log("Room ID:", roomId);

      if (!roomId) {
        throw new Error("Failed to mint NFT or retrieve roomId");
      }

      // 2. Create room in Firestore using TRPC
      const room = await createRoom({
        name: roomName,
        nftId: Number(roomId),
        isPublic: isPublic,
        creator_id: accounts[0] ?? provider?.accounts[0],
      });

      console.log("Room created:", room);

      // Refresh rooms after creation
      fetchUserRooms();

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

  const fetchUserRooms = async () => {
    if (!accounts?.[0] || !provider || !isAuthenticated) return;

    setIsLoadingRooms(true);
    try {
      // 1. Get user's NFT IDs from LUKSO blockchain
      const luksoRpc = new LuksoRpc(provider);
      const subscribedRooms = await luksoRpc.getUserSubscribedRooms();

      if (subscribedRooms.length === 0) {
        setMyRooms([]);
        setIsLoadingRooms(false);
        return;
      }

      // 2. Fetch rooms from Firebase where nftId matches any of the user's NFTs
      // We'll assume you have some way to fetch all rooms or filter by nftIds
      const allRooms = await fetchAllRooms();

      // Filter rooms that match user's NFT IDs and where the user is the creator
      const userRooms = allRooms.filter(
        (room: any) =>
          subscribedRooms.includes(room.nftId) &&
          room.creator_id === accounts[0]
      );

      setMyRooms(userRooms);
    } catch (error) {
      console.error("Error fetching user rooms:", error);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const toggleSwitcher = () => {
    if (!showSwitcher && isAuthenticated) {
      fetchUserRooms();
    }
    setShowSwitcher(!showSwitcher);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 h-full flex flex-col">
      <div className="overflow-hidden rounded-2xl shadow-xl flex-grow flex flex-col max-h-[95vh] bg-white/90">
        {/* Background Image with Header - Reduced height */}
        <div
          className="relative"
          style={{ maxHeight: "30vh", minHeight: "160px" }}
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

          {/* Header Content with Logo and Switcher */}
          <div className="relative z-10 px-6 py-4 flex justify-between items-center">
            <img src="/brand_logo.png" alt="brand" style={{ height: "45px" }} />

            {isAuthenticated && (
              <button
                onClick={toggleSwitcher}
                className="p-2 bg-gray-800/50 backdrop-blur-sm hover:bg-gray-700/60 rounded-lg transition-colors duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Card Body - Dark Theme with Scrollable Container */}
        <div className="bg-gray-900/90 backdrop-blur-sm p-6 flex-grow overflow-y-auto">
          {/* My Rooms View */}
          {showSwitcher && isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">My Rooms</h2>
                <button
                  onClick={toggleSwitcher}
                  className="p-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {isLoadingRooms ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
                </div>
              ) : myRooms && myRooms.length > 0 ? (
                <div className="space-y-3">
                  {myRooms.map((room: any) => (
                    <div
                      key={room.id}
                      className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => handleJoinRoom(room.nftId.toString())}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-white">{room.name}</h3>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            room.isPublic
                              ? "bg-green-600/50"
                              : "bg-yellow-600/50"
                          }`}
                        >
                          {room.isPublic ? "Public" : "Private"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Room ID: {room.nftId}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 relative">
                  <p>You haven&apos;t created any rooms yet.</p>
                  <button
                    className="mt-4 px-4 py-2 bg-red-600/80 hover:bg-red-700/90 text-white rounded-lg"
                    onClick={() => {
                      setShowSwitcher(false);
                      setShowCreateForm(true);
                    }}
                    disabled={!accounts[0]}
                  >
                    Create Your First Room
                  </button>
                  {!accounts[0] && (
                    <span className="text-red-65 text-sm justify-center text-center w-full  absolute flex top-0 items-center ">
                      <FaAsterisk className="mr-2" /> UP Required
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Main Content Container */
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
                          className="block text-sm font-medium text-gray-300 mb-1 relative"
                        >
                          Room ID
                          {!accounts[0] && (
                            <span className="text-red-65 text-sm absolute flex right-0 top-0 items-center ">
                              <FaAsterisk className="mr-2" /> UP Required
                            </span>
                          )}
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
                        className="w-full bg-red-600/80 hover:bg-red-700/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                        onClick={() => handleJoinRoom()}
                        disabled={!roomIdInput.trim() || !accounts[0]}
                      >
                        Join Room
                      </button>

                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-gray-700"></div>
                        <span className="flex-shrink mx-4 text-gray-500">
                          or
                        </span>
                        <div className="flex-grow border-t border-gray-700"></div>
                      </div>

                      <button
                        className="w-full bg-gray-700/80 hover:bg-gray-600/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                        onClick={() => setShowCreateForm(true)}
                        disabled={!accounts[0]}
                      >
                        Create New Room
                      </button>
                    </>
                  )}

                  {/* If room ID is in URL, show only join button */}
                  {showRoomIdFromUrl && (
                    <button
                      className="w-full bg-blue-red/80 hover:bg-red-700/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                      onClick={() => handleJoinRoom()}
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
                      className="flex-1 bg-blue-red/80 hover:bg-red-700/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg font-medium transition duration-200"
                      onClick={handleCreateRoom}
                      disabled={isCreatingRoom || !roomName.trim()}
                    >
                      {isCreatingRoom ? "Creating..." : "Create"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
