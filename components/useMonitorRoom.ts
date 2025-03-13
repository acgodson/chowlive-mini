import { useEffect } from "react";
import { useAtom } from "jotai";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { getFirestoreDB } from "@/configs/firebase-app-config";
import Room from "@/components/models/Room";
import { roomAtom } from "./state/roomAtom";

const useMonitorRoom = (slug?: string): Room => {
  const [room, setRoom] = useAtom(roomAtom);
  const db = getFirestoreDB();

  useEffect(() => {
    if (!slug || room.slug === slug) return;

    const fetchRoom = async () => {
      const roomsRef = collection(db, "rooms");
      const q = query(roomsRef, where("slug", "==", slug));

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const roomData = querySnapshot.docs[0].data() as Room;
        setRoom({
          ...roomData,
          id: querySnapshot.docs[0].id,
        });
      }
    };

    fetchRoom();

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      query(collection(db, "rooms"), where("slug", "==", slug)),
      (snapshot) => {
        if (!snapshot.empty) {
          const roomData = snapshot.docs[0].data() as Room;
          setRoom({
            ...roomData,
            id: snapshot.docs[0].id,
          });
        }
      },
      (error) => {
        console.error("Error listening to room updates:", error);
      }
    );

    // Cleanup function to unsubscribe from the listener when the component unmounts
    return () => unsubscribe();
  }, [db, room.slug, setRoom, slug]);

  return room;
};

export default useMonitorRoom;
