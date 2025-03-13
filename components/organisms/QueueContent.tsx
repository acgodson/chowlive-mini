import useSpotifyTrack from "../useSpotifyTrack";

const QueueContent = (song: any) => {
  const track = useSpotifyTrack(song);

  if (!track) {
    return "loading";
  }
  return (
    <>
      return (
      <li className="bg-gray-700 rounded p-2">
        <div className="flex items-center">
          <img
            src={track.album?.images[0]?.url || "/placeholder-album.png"}
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
      );
    </>
  );
};

export default QueueContent;
