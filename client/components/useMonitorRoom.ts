import { useEffect, useState } from "react";
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
import LuksoRpc from "@/lib/web3-rpc";
import { useUpProvider } from "./upProvider";

interface MonitorRm {
  room: Room;
  isLoadingRoom: boolean;
  isSubscribed: boolean;
}

const useMonitorRoom = (slug?: string | number): MonitorRm => {
  const [room, setRoom] = useAtom(roomAtom);
  const [isLoadingRoom, setisLoadingRoom] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const db = getFirestoreDB();
  const { accounts } = useUpProvider();

  useEffect(() => {
    if (!slug || room.slug === slug) return;

    const fetchRoom = async () => {
      const roomsRef = collection(db, "rooms");

      try {
        setisLoadingRoom(true);

        let q;
        if (typeof slug === "string") {
          const numSlug = Number(slug);
          if (!isNaN(numSlug)) {
            // If the number is greater than MAX_SAFE_INTEGER, treat it as a BigInt
            q =
              numSlug > Number.MAX_SAFE_INTEGER
                ? query(roomsRef, where("nftId", "==", BigInt(slug)))
                : query(roomsRef, where("nftId", "==", numSlug));
          } else {
            q = query(roomsRef, where("slug", "==", slug));
          }
        } else {
          q =
            typeof slug === "number" || typeof slug === "bigint"
              ? query(roomsRef, where("nftId", "==", slug))
              : query(roomsRef, where("slug", "==", slug));
        }

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const roomData = querySnapshot.docs[0].data() as Room;
          setRoom({
            ...roomData,
            id: querySnapshot.docs[0].id,
          });
        }
        setisLoadingRoom(false);
      } catch (e) {
        setisLoadingRoom(false);
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

  useEffect(() => {
    const checkSubscription = async () => {
      if (!room.nftId || !accounts[0]) return;

      const luksoRpc = new LuksoRpc({ accounts });
      const subscribed = await luksoRpc.isSubscribedToRoom(room.nftId);
      setIsSubscribed(subscribed);
    };

    checkSubscription();
  }, [room.nftId, accounts]);

  return { room, isLoadingRoom, isSubscribed };
};

export default useMonitorRoom;
