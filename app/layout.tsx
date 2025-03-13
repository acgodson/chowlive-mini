import type { Metadata } from "next";
import "@/styles/globals.scss";
import { UpProvider } from "@/components/upProvider";

export const metadata: Metadata = {
  title: "Chowlive MiniApp",
  description: "Music on the Social Blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>
        <UpProvider>{children}</UpProvider>
      </body>
    </html>
  );
}
