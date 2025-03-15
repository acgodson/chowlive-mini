"use client";

import { Home } from "@/src/components/organisms/Home";
import { ConnectButton } from "@/src/components/molecules/connectButton";

export default function HomeApp() {
  return (
    <>
      <ConnectButton />
      <Home />
    </>
  );
}
