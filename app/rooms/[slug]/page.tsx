import { RoomView } from "@/components/organisms/RoomView";
import { notFound } from "next/navigation";
// import { Metadata } from "next";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  return (
    <>
      <RoomView slug={slug} />
    </>
  );
}
