"use client";

import { produce } from "immer";
import Spotify from "spotify-web-api-js";
import { create } from "zustand";

export enum Modal {
  None = "none",
  DeviceSelect = "device-select",
  PlaybackControl = "playback-control",
  QueueSong = "queue-song",
}

export type SpotifyAPI = Spotify.SpotifyWebApiJs;

export interface Store {
  set: (callback: (store: Store) => void) => void;

  modal: Modal;
  setModal: (modal: Modal) => void;
  handleSetModal: (modal: Modal) => () => void;

  spotify: SpotifyAPI;
}

// Create a store with empty initial values to be initialized on the client
let store: any = null;

// This is the function that creates the store
const createStore = () =>
  create<Store>((set) => ({
    set: (callback) => set(produce(callback)),

    modal: Modal.None,
    setModal: (modal) => set({ modal }),
    handleSetModal: (modal) => () =>
      set((state) => ({ modal: state.modal === modal ? Modal.None : modal })),

    spotify: new Spotify(),
  }));

// This is a function that returns the store, creating it if it doesn't exist
const useStore = (selector: any) => {
  // For SSR / SSG, return a dummy store if we're not in the browser
  if (typeof window === "undefined") {
    // Return dummy values that match the shape of what selector expects
    const dummyState = {
      spotify: {},
      modal: Modal.None,
      setModal: () => {},
      handleSetModal: () => () => {},
      set: () => {},
    };
    return selector(dummyState);
  }

  // Initialize the store if it doesn't exist yet (client-side only)
  if (!store) {
    store = createStore();
  }

  // Use the store with the selector
  return store(selector);
};

export default useStore;
