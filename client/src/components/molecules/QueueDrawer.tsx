import React, { useState, useEffect } from "react";
import { getDatabase, ref, get } from "firebase/database";
import { trpc } from "@/src/trpc/client";
import { useSpotify } from "@/src/services/spotify/spotifyContext";
import { useAtom } from "jotai";
import { roomAtom } from "@/src/state/roomAtom";
import { signInWithCustomToken, getAuth } from "firebase/auth";
// import useSpotifyTrack from "../useSpotifyTrack";
import QueueContent from "./QueueContent";

const QueueDrawer = ({ isOpen, onClose, queue }: any) => {
  const { spotify } = useSpotify();
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSearched, setLastSearched] = useState(0);
  const [searchResults, setSearchResults] = useState<
    SpotifyApi.TrackObjectFull[]
  >([]);
  const [room] = useAtom(roomAtom);
  const [user, setUser] = useState<any>(null);

  const { mutateAsync: queueTrack } = trpc.queueSong.useMutation();

  // Function to get cookie value - same as in your hook
  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;

    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  // Initialize Firebase auth - same as in your hook
  useEffect(() => {
    const initAuth = async () => {
      try {
        const firebaseToken = getCookie("firebase_auth_token");
        if (firebaseToken) {
          const auth = getAuth();
          const userCredential = await signInWithCustomToken(
            auth,
            firebaseToken
          );
          setUser(userCredential.user);
        }
      } catch (error) {
        console.error("Error initializing auth from cookie:", error);
      }
    };

    initAuth();
  }, []);

  // Function to fetch Spotify token - same as in your hook
  async function fetchSpotifyToken() {
    // First try to get token from cookie (faster)
    const spotifyTokenFromCookie = getCookie("spotify_token");
    if (spotifyTokenFromCookie) {
      return spotifyTokenFromCookie;
    }

    // If no cookie token and we have a user, try from Firebase
    if (user?.uid) {
      try {
        const rtdb = getDatabase();
        const tokenSnapshot = await get(
          ref(rtdb, `spotifyAccessToken/${user.uid}`)
        );
        const accessToken = tokenSnapshot.val();

        // If found, store in cookie for next time
        if (accessToken) {
          document.cookie = `spotify_token=${accessToken};path=/;max-age=2592000;samesite=none;secure`;
        }

        return accessToken;
      } catch (error) {
        console.error("Error fetching Spotify token from Firebase:", error);
        return null;
      }
    }

    return null;
  }

  // Reset search when drawer opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isOpen]);

  const handleQueueTrack = async (track: any) => {
    await queueTrack({
      roomId: room.id.toString(),
      spotifyUri: track.uri,
      progress: 0,
      duration_ms: track.duration_ms,
    }).catch(console.error);

    setSearchQuery("");
    onClose();
  };

  const onChangeSpotifySearchQuery = async (e: any) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value === "" || !spotify) {
      setSearchResults([]);
      return;
    }

    if (Date.now() - lastSearched > 250) {
      try {
        setLastSearched(Date.now());

        // Get token using the same method as your hook
        const provider_token = await fetchSpotifyToken();

        if (!provider_token) {
          console.error("No Spotify access token available");
          return;
        }

        spotify.setAccessToken(provider_token);
        const results = await spotify.searchTracks(value);
        setSearchResults(results.tracks.items.slice(0, 4));
      } catch (error) {
        console.error("Error searching tracks:", error);
      }
    }
  };

  return (
    <div
      className={`fixed right-0 top-0 bottom-0 w-64 bg-gray-800 bg-opacity-95 rounded-l-lg shadow-lg overflow-y-auto z-10 transform transition-transform ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-bold">Queue</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="mb-4">
          <input
            type="text"
            className="w-full bg-gray-700 text-white border-none rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search songs..."
            value={searchQuery}
            onChange={onChangeSpotifySearchQuery}
          />
        </div>

        {/* Search results */}
        {searchResults.length > 0 ? (
          <div className="mb-4">
            <h3 className="text-white text-sm font-medium mb-2">
              Search Results
            </h3>
            <ul className="space-y-2">
              {searchResults.map((track: any, index: number) => (
                <li
                  key={index}
                  className="bg-gray-700 rounded p-2 cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => handleQueueTrack(track)}
                >
                  <div className="flex items-center">
                    <img
                      src={
                        track.album?.images[0]?.url || "/placeholder-album.png"
                      }
                      alt={track.album?.name || "Album art"}
                      className="w-10 h-10 rounded mr-2"
                    />
                    <div className="overflow-hidden">
                      <p className="text-white text-sm font-medium truncate">
                        {track.name}
                      </p>
                      <p className="text-gray-400 text-xs truncate">
                        {track.artists?.map((a: any) => a.name).join(", ")}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          searchQuery && (
            <p className="text-gray-400 text-sm mb-4">No results found</p>
          )
        )}

        {/* Existing Queue */}
        <h3 className="text-white text-sm font-medium mb-2">Current Queue</h3>
        {queue && queue.length > 0 ? (
          <ul className="space-y-2">
            {queue.map((song: any, index: number) => {
              return <QueueContent key={index} song={song} />;
            })}
          </ul>
        ) : (
          <p className="text-gray-400">No songs in queue</p>
        )}
      </div>
    </div>
  );
};

export default QueueDrawer;
