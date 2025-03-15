"use client";

import React, { useState, useEffect, useMemo } from "react";

import { useUpProvider } from "@/src/services/lukso/upProvider";
import useMonitorRoom from "@/src/hooks/useMonitorRoom";
import { trpc } from "@/src/trpc/client";
import useQueue from "@/src/hooks/useQueue";
import useHandlePlayback from "@/src/hooks/useHandlePlayback";
import useSpotifyTrack from "@/src/hooks/useSpotifyTrack";
import { useSpotifyAuth } from "@/src/hooks/useSpotifyAuth";
import QueueDrawer from "../molecules/QueueDrawer";
import RoomSkeletonLoader from "../molecules/roomSkeletonLoader";
import { abbreviateAddress } from "@/src/configs/env";
import { FiClipboard, FiCheck } from "react-icons/fi";
import { getAddress } from "viem";
import { useRouter } from "next/navigation";
import LuksoRpc from "@/src/services/lukso";

export const RoomView = ({ slug }: { slug: any }) => {
  const roomId = slug;
  const router = useRouter();
  const { accounts, provider } = useUpProvider();
  const {
    isAuthenticated,
    isLoading: isLoadingSpotify,
    connect,
  } = useSpotifyAuth();
  const [isInIframe, setIsInIframe] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [changeToIsPaused, setChangeToIsPaused] = useState(true);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isSkippingSong, setIsSkippingSong] = useState(false);

  const { mutateAsync: updatePlayback } = trpc.updatePlayback.useMutation();
  const { room, isLoadingRoom, isSubscribed } = useMonitorRoom(slug);
  const queue = useQueue(room.id);

  const song = queue ? queue[0] || undefined : undefined;
  const [progress, setProgress] = useState(0);
  const memoizedSong = useMemo(
    () => song,
    [
      song?.id,
      song?.spotifyUri,
      song?.isPaused,
      song?.progress,
      song?.duration_ms,
    ]
  );
  useHandlePlayback(memoizedSong, setProgress);
  const progressPercentage = song?.duration_ms
    ? Math.min((progress / song.duration_ms) * 100, 100)
    : 0;

  const spotifyTrackResult = useSpotifyTrack(memoizedSong);
  const currentTrack = spotifyTrackResult;

  useEffect(() => {
    console.log("[RoomView] spotifyTrackResult:", spotifyTrackResult);
    console.log("[RoomView] currentTrack:", currentTrack);
  }, [spotifyTrackResult, currentTrack]);

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  useEffect(() => {
    console.log(
      "[RoomView] currentTrack:",
      currentTrack
        ? {
            id: currentTrack.id,
            name: currentTrack.name,
            hasAlbum: !!currentTrack.album,
            hasImages: currentTrack.album?.images?.length > 0,
            firstImageUrl: currentTrack.album?.images?.[0]?.url,
          }
        : "undefined/null"
    );
  }, [currentTrack]);

  const [currentTrackKey, setCurrentTrackKey] = useState(0);
  const isPaused = song ? song.isPaused : false;

  useEffect(() => {
    console.log(
      "[RoomView] song updated:",
      song
        ? {
            id: song.id,
            spotifyUri: song.spotifyUri,
            isPaused: song.isPaused,
          }
        : "undefined/null"
    );

    console.log(
      "[RoomView] memoizedSong:",
      memoizedSong
        ? {
            id: memoizedSong.id,
            spotifyUri: memoizedSong.spotifyUri,
            isPaused: memoizedSong.isPaused,
          }
        : "undefined/null"
    );
  }, [song, memoizedSong]);

  useEffect(() => {
    setChangeToIsPaused(isPaused);
    console.log(changeToIsPaused);
  }, [isPaused]);

  useEffect(() => {
    if (song?.id) {
      // Force a refresh of the currentTrack when song changes
      setCurrentTrackKey((prev) => prev + 1);
      console.log("Track display forced to refresh for song:", song.id);
    }
  }, [song?.id]);

  const onBack = () => router.back();

  const handleJoin = async () => {
    if (!accounts[0] || !room) return;

    try {
      setIsLoading(true);
      const luksoRpc = new LuksoRpc(provider);

      console.log("Joining room with params:", {
        name: room.name,
        nftID: room.nftId,
      });

      const response = await luksoRpc.joinRoom(room.nftId);
      console.log("subscription fee", response.fee);
      setIsJoined(true);
      setIsLoading(false);
    } catch (err) {
      setError("Failed to join room");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipForward = async () => {
    if (!song) return;

    console.log("Skipping song...");
    setIsSkippingSong(true);

    await updatePlayback({
      shouldSkip: true,
      songId: song.id,
      track: {
        spotify_uri: song.spotifyUri,
        duration_ms: song.duration_ms,
      },
    });

    setIsSkippingSong(false);
    console.log("Skipped song.");
  };

  const handleTogglePlay = async () => {
    if (!song || isLoadingSpotify || !isAuthenticated) {
      console.log("[RoomView] Toggle play aborted - missing requirements:", {
        hasSong: !!song,
        isLoadingSpotify,
        isAuthenticated,
      });
      return;
    }

    try {
      const newIsPaused = !isPaused;
      console.log(
        `[RoomView] Toggling playback state to ${
          newIsPaused ? "paused" : "playing"
        }`
      );

      // Update local state immediately for responsive UI
      setChangeToIsPaused(newIsPaused);

      // Call the server to update the playback state
      const response = await updatePlayback({
        isPaused: newIsPaused,
        songId: song.id,
      });

      console.log("[RoomView] Playback update response:", response);

      if (response === undefined) {
        // This is normal - server returns undefined on success
        console.log(newIsPaused ? "Paused song." : "Played song.");
      } else {
        console.warn("Unexpected response from updatePlayback:", response);
      }

      // Trigger useHandlePlayback to run again by forcing a refresh of the trackKey
      setTimeout(() => {
        setCurrentTrackKey((prev) => prev + 1);
      }, 300);
    } catch (error) {
      console.error("Playback toggle failed", error);
      // Revert the local state change since the server update failed
      setChangeToIsPaused(isPaused);
    }
  };
  const addToQueue = () => {
    console.log("Opening add to queue dialog");
    setIsQueueOpen(true);
  };

  const closeQueueDrawer = () => {
    setIsQueueOpen(false);
  };

  const [isCopied, setIsCopied] = useState(false);

  const handleCopyUrl = () => {
    const url = `${window.location.origin}/rooms/${room.slug}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        console.log("URL copied to clipboard:", url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy URL:", err);
      });
  };

  if (isLoadingSpotify) {
    return (
      <div className="p-4 w-full max-w-md mx-auto">
        <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden w-full">
          <div className="flex justify-center items-center h-64 p-8">
            <div className="animate-pulse w-full max-w-sm">
              {/* Header skeleton */}
              <div className="mb-4 w-3/4 mx-auto">
                <div className="h-6 bg-gray-700 rounded-lg w-full mb-2"></div>
                <div className="h-4 bg-gray-800 rounded-lg w-3/4 mx-auto"></div>
              </div>

              {/* Album art skeleton */}
              <div className="flex justify-center mb-6">
                <div className="rounded-lg bg-gray-700 h-32 w-32"></div>
              </div>

              {/* Controls skeleton */}
              <div className="space-y-3">
                {/* Progress bar skeleton */}
                <div className="h-2 bg-gray-800 rounded-full w-full"></div>

                {/* Buttons skeleton */}
                <div className="flex justify-between">
                  <div className="flex space-x-2">
                    <div className="rounded-full bg-gray-800 h-10 w-10"></div>
                    <div className="rounded-full bg-gray-800 h-10 w-10"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="rounded-full bg-gray-800 h-10 w-10"></div>
                    <div className="rounded-full bg-gray-800 h-10 w-10"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    (!isLoadingSpotify && error) ||
    (!isLoadingSpotify && !room) ||
    isLoadingRoom
  ) {
    return <RoomSkeletonLoader />;
  }

  if ((!isLoadingSpotify && error) || (!isLoadingSpotify && !room)) {
    return (
      <div className="w-full max-w-md mx-auto p-4">
        <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden w-full">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Error</h2>
            <p className="text-gray-300 mb-4">{error || "Room not found"}</p>
            <button
              onClick={onBack}
              className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition duration-200"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const TrackDebugger = ({ currentTrack, song, progress }: any) => {
    if (!song) return null;

    return (
      <div className="fixed bottom-0 right-0 bg-black/80 text-white p-2 text-xs z-50 max-w-xs overflow-auto">
        <div className="font-bold mb-1">Debug Info:</div>
        <div>Song ID: {song?.id?.substring(0, 8)}...</div>
        <div>Is Paused: {song?.isPaused ? "Yes" : "No"}</div>
        <div>
          Progress: {progress}ms ({(progress / 1000).toFixed(1)}s)
        </div>
        <div>
          Duration: {song?.duration_ms}ms (
          {(song?.duration_ms / 1000).toFixed(1)}s)
        </div>
        <div>Track Loaded: {currentTrack ? "Yes" : "No"}</div>
        {currentTrack && (
          <>
            <div className="font-bold mt-1">Track Data:</div>
            <div>Name: {currentTrack.name}</div>
            <div>Album: {currentTrack.album?.name}</div>
            <div>
              Has Images:{" "}
              {currentTrack.album?.images?.length > 0 ? "Yes" : "No"}
            </div>
            {currentTrack.album?.images?.[0] && (
              <div>
                <div>Image URL:</div>
                <div className="break-all">
                  {currentTrack.album.images[0].url}
                </div>
              </div>
            )}
          </>
        )}
        <button
          onClick={() => {
            console.log("[DEBUG] Full currentTrack:", currentTrack);
            console.log("[DEBUG] Full song:", song);
            // Force refresh track display
            //@ts-ignore
            if ((window as any).__forceLoadSpotifyTrack) {
              //@ts-ignore
              window.__forceLoadSpotifyTrack();
            }
          }}
          className="mt-2 bg-red-600 text-white px-2 py-1 rounded text-xs"
        >
          Refresh Track
        </button>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden ">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 ">
          <div className="flex justify-between items-center relative">
            <div className="flex items-center">
              <div className="opacity-90">
                <img src="/logo.svg" alt="brand" style={{ height: "30px" }} />
              </div>
              <h2 className="text-md font-semibold text-white flex items-center">
                Room: {room.name || "Room Name"}
                <button
                  onClick={handleCopyUrl}
                  className="ml-2 text-gray-400 hover:text-white transition-colors"
                >
                  {isCopied ? (
                    <FiCheck className="w-5 h-5" />
                  ) : (
                    <FiClipboard className="w-5 h-5" />
                  )}
                </button>
              </h2>
            </div>
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
          </div>
          <p className="text-xs text-gray-400">Room ID: {room.id || roomId}</p>
          <p className="text-xs text-gray-400">NFT ID: {room.nftId}</p>
          <p className="text-xs text-gray-400">
            Host:{" "}
            {room.creator_id
              ? abbreviateAddress(getAddress(room.creator_id))
              : "Unknown"}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isLoadingRoom && !isAuthenticated ? (
            <div className="mb-2">
              <button
                className="w-full bg-green-600/80 hover:bg-green-700/90 backdrop-blur-sm text-white py-3 px-4 rounded-lg font-medium transition duration-200 flex items-center justify-center"
                disabled={isLoadingSpotify}
                onClick={connect}
              >
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                {isLoadingSpotify ? "Connecting..." : "Connect Spotify"}
              </button>
            </div>
          ) : room && !isSubscribed && room.creator_id !== accounts[0] ? (
            <div className="flex flex-col items-center py-8">
              <p className="mb-4 text-gray-300">
                Let&lsquo;s queue songs and vibe together!
              </p>
              {isLoadingRoom ? (
                "Loading room..."
              ) : (
                <button
                  disabled={isLoading || isLoadingRoom || !accounts[0]}
                  onClick={handleJoin}
                  className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-medium transition duration-200"
                >
                  Join Room
                </button>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* Music Player */}
              <div className="mb-6 overflow-hidden">
                <div className="relative h-48 rounded-lg overflow-hidden mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 opacity-100 animate-gradient-x"></div>
                  {/* <div className="absolute inset-0 backdrop-blur-sm"></div> */}
                  {currentTrack ? (
                    <div
                      key={currentTrackKey}
                      className="flex items-center justify-center h-full relative"
                      data-has-track="true"
                    >
                      {/* Add debug info above track display */}
                      <div className="absolute top-0 left-0 right-0 bg-black/50 text-xs text-gray-300 p-1 z-10">
                        Track: {currentTrack.name} [
                        {currentTrack.id?.substring(0, 6)}...]
                      </div>

                      <img
                        src={
                          currentTrack.album?.images?.[0]?.url ||
                          "/placeholder-album.png"
                        }
                        alt={currentTrack.album?.name || "Album art"}
                        className="w-32 h-32 rounded-lg object-cover shadow-lg"
                        onLoad={() =>
                          console.log(
                            "[RoomView] Image loaded successfully:",
                            currentTrack.album?.images?.[0]?.url
                          )
                        }
                        onError={(e) => {
                          console.error("[RoomView] Image failed to load:", e);
                          console.log(
                            "[RoomView] Image URL was:",
                            currentTrack.album?.images?.[0]?.url
                          );
                          // Fallback to placeholder
                          (e.target as HTMLImageElement).src =
                            "/placeholder-album.png";
                        }}
                      />
                      <div className="ml-4 text-white">
                        <h3 className="text-lg font-bold">
                          {currentTrack.name || "[No track name]"}
                        </h3>
                        <p className="text-sm text-gray-300">
                          {currentTrack.artists
                            ? currentTrack.artists
                                .map((a: any) => a.name)
                                .join(", ")
                            : "[No artists]"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex relative items-center justify-center h-full text-white"
                      data-has-track="false"
                    >
                      <img
                        src="/mc/Chowlive_Character(13).png"
                        alt="DJ Character"
                        className="h-full object-contain"
                      />

                      <p className="text-center absolute backdrop-blur-sm p-16">
                        No track currently playing
                        {/* {song ? (
                          <span className="block text-xs text-gray-300 mt-2">
                            Has song: {song.id.substring(0, 8)}...
                            <br />
                            URI: {song.spotifyUri}
                            <br />
                            Paused: {song.isPaused ? "Yes" : "No"}
                          </span>
                        ) : (
                          ""
                        )} */}
                      </p>
                    </div>
                  )}
                </div>

                {/* Controls */}
                {accounts[0] &&
                  accounts[0].length > 0 &&
                  (isJoined ||
                    isSubscribed ||
                    (getAddress(room.creator_id) ===
                      getAddress(accounts[0]) && (
                      <div>
                        {/* Progress bar */}
                        <div className="w-full h-2 bg-gray-700 rounded-full mb-4">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>

                        {/* Control buttons */}
                        <div className="flex justify-between items-center">
                          <div className="flex space-x-4">
                            <button
                              onClick={handleTogglePlay}
                              className="p-3 rounded-full hover:bg-gray-800 transition-colors"
                            >
                              {isPaused ? (
                                <svg
                                  className="w-6 h-6 text-white"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              ) : (
                                <svg
                                  className="w-6 h-6 text-white"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                </svg>
                              )}
                            </button>
                            <button
                              disabled={isSkippingSong}
                              onClick={handleSkipForward}
                              className="p-3 rounded-full hover:bg-gray-800 transition-colors"
                            >
                              <svg
                                className="w-6 h-6 text-white"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                              </svg>
                            </button>
                          </div>

                          <div className="flex space-x-4">
                            <button
                              onClick={() => setIsQueueOpen(!isQueueOpen)}
                              className="p-3 rounded-full hover:bg-gray-800 transition-colors"
                            >
                              <svg
                                className="w-6 h-6 text-white"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M4 10h12v2H4v-2zm0-4h16v2H4V6zm0 8h8v2H4v-2zm10 0h6v2h-6v-2z" />
                              </svg>
                            </button>
                            <button
                              onClick={addToQueue}
                              className="p-3 rounded-full hover:bg-gray-800 transition-colors"
                            >
                              <svg
                                className="w-6 h-6 text-white"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )))}
              </div>

              {/* Queue Drawer (conditionally rendered) */}
              {isQueueOpen && (
                <div className="absolute right-0 top-0 bottom-0 w-64 bg-gray-800 bg-opacity-95 rounded-l-lg shadow-lg overflow-y-auto z-10 transform transition-transform">
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-white text-lg font-bold">Queue</h2>
                      <button
                        onClick={() => setIsQueueOpen(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      </button>
                    </div>

                    <QueueDrawer
                      isOpen={isQueueOpen}
                      onClose={closeQueueDrawer}
                      roomId={room.id}
                      queue={queue}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {!isInIframe && (
        <TrackDebugger
          currentTrack={currentTrack}
          song={song}
          progress={progress}
        />
      )}
    </div>
  );
};
