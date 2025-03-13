import useSongs from "./firebase/useSongs";
import { Queue } from "./models/Room";

const useQueue = (roomID: string): Queue => useSongs(roomID).array;

export default useQueue;
