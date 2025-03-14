"use client";

import { Home } from "@/components/organisms/Home";
import { ConnectButton } from "@/components/molecules/connectButton";

export default function HomeApp() {
  return (
    <>
      <ConnectButton />
      <Home onJoinRoom={() => {}} />
    </>
  );
}
