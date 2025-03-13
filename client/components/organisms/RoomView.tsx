"use client";

import React, { useState, useEffect, useMemo } from "react";
import { joinRoom } from "../RoomRoll/";
import { useUpProvider } from "../upProvider";
import useMonitorRoom from "../useMonitorRoom";
import { trpc } from "@/trpc/client";
// import { playbackConfigurationAtom } from "../state/playbackConfigurationAtom";
// import { useAtom } from "jotai";
import useQueue from "../useQueue";
import useHandlePlayback from "../useHandlePlayback";
import useSpotifyTrack from "../useSpotifyTrack";
import { useSpotifyAuth } from "../useSpotifyAuth";
import QueueDrawer from "./QueueDrawer";

export const RoomView = ({ slug }: { slug: any }) => {
  const room = useMonitorRoom(slug);
  const queue = useQueue(room.id);
  const song = queue ? queue[0] || undefined : undefined;
  const [progress, setProgress] = useState(0);
  const memoizedSong = useMemo(() => song, [song?.id]);
  const {} = useHandlePlayback(memoizedSong, setProgress);

  const { accounts } = useUpProvider();

  const currentTrack = useSpotifyTrack(song);
  // const isSongInQueue = !!track && !!song;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  // const [isCreator] = useState(false);
  const {
    // isAuthenticated,
    isLoading: isLoadingSpotify,
    // connect,
  } = useSpotifyAuth();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isSkippingSong, setIsSkippingSong] = useState(false);

  // const [playbackConfiguration, setPlaybackConfiguration] = useAtom(
  //   playbackConfigurationAtom
  // );

  const roomId = slug;

  const [changeToIsPaused, setChangeToIsPaused] = useState(true);
  const { mutateAsync: updatePlayback } = trpc.updatePlayback.useMutation();

  const isPaused = song ? song.isPaused : false;

  useEffect(() => {
    setChangeToIsPaused(isPaused);
    console.log(changeToIsPaused);
  }, [isPaused]);

  const onBack = () => {
    // Handle navigation back
    window.history.back();
  };

  const handleJoin = async () => {
    if (!accounts[0] || !room) return;

    try {
      setIsLoading(true);
      const joined = await joinRoom(roomId, accounts[0]);
      if (joined) {
        setIsJoined(true);
      }
    } catch (err) {
      setError("Failed to join room");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // const handleTogglePlaybackConfiguration = () =>
  //   setPlaybackConfiguration({
  //     ...playbackConfiguration,
  //     linked: !playbackConfiguration.linked,
  //   });

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
    if (!song) return;
    setChangeToIsPaused(!isPaused);

    await updatePlayback({
      isPaused: !isPaused,
      songId: song.id,
    });

    console.log(isPaused ? "Played song." : "Paused song.");
  };

  const addToQueue = () => {
    console.log("Add to queue");
    setIsQueueOpen(true);
  };

  const closeQueueDrawer = () => {
    setIsQueueOpen(false);
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

  if ((!isLoadingSpotify && error) || (!isLoadingSpotify && !room)) {
    return (
      <div className="p-4">
        <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
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

  return (
    <div className="p-4">
      <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">{room.name}</h2>
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
          </div>
          <p className="text-sm text-gray-400">Room ID: {room.id || roomId}</p>
          <p className="text-sm text-gray-400">NFT ID: {room.nftId}</p>
          <p className="text-sm text-gray-400">
            Host: {room.creator_id || "Unknown"}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* /ToDO: change to account address for host */}
          {!isJoined && room.creator_id !== accounts[0] ? (
            <div className="flex flex-col items-center py-8">
              <p className="mb-4 text-gray-300">
                Join this room to listen together
              </p>
              <button
                disabled={isLoading}
                onClick={handleJoin}
                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition duration-200"
              >
                Join Room
              </button>
            </div>
          ) : (
            <div className="relative">
              {/* Music Player */}
              <div className="mb-6 overflow-hidden">
                <div className="relative h-48 rounded-lg overflow-hidden mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 opacity-50 animate-gradient-x"></div>
                  <div className="absolute inset-0 backdrop-blur-sm"></div>

                  {currentTrack ? (
                    <div className="flex items-center justify-center h-full">
                      <img
                        src={
                          currentTrack.album?.images[0]?.url ||
                          "/placeholder-album.png"
                        }
                        alt={currentTrack.album?.name || "Album art"}
                        className="w-32 h-32 rounded-lg object-cover shadow-lg"
                      />
                      <div className="ml-4 text-white">
                        <h3 className="text-lg font-bold">
                          {currentTrack.name}
                        </h3>
                        <p className="text-sm text-gray-300">
                          {currentTrack.artists
                            ?.map((a: any) => a.name)
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex relative items-center justify-center h-full text-white">
                      <img
                        src="/mc/Chowlive_Character(13).png"
                        alt="DJ Character"
                        className="h-full object-contain"
                      />

                      <p className="text-center absolute backdrop-blur-sm p-16">
                        No track currently playing
                      </p>
                    </div>
                  )}
                </div>

                {/* Controls */}
                {isJoined ||
                  (room.creator_id === accounts[0] && (
                    <div>
                      {/* Progress bar */}
                      <div className="w-full h-2 bg-gray-700 rounded-full mb-4">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${progress}%` }}
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
                  ))}
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

                    {/* {queue && queue.length > 0 ? (
                      <ul className="space-y-2">
                        {queue.map((song: any, index: number) => (
                          <li key={index} className="bg-gray-700 rounded p-2">
                            <div className="flex items-center">
                              <img
                                src={
                                  song.album?.images[0]?.url ||
                                  "/placeholder-album.png"
                                }
                                alt={song.album?.name || "Album art"}
                                className="w-10 h-10 rounded mr-2"
                              />
                              <div className="overflow-hidden">
                                <p className="text-white text-sm font-medium truncate">
                                  {song.name}
                                </p>
                                <p className="text-gray-400 text-xs truncate">
                                  {song.artists
                                    ?.map((a: any) => a.name)
                                    .join(", ")}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400">No songs in queue</p>
                    )} */}
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
