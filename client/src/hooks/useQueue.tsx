import useSongs from "@/src/lib/firebase/useSongs";
import { Queue } from "@/src/lib/models/Room";

const useQueue = (roomID: string): Queue => useSongs(roomID).array;

export default useQueue;
