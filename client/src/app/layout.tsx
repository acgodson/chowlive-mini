import type { Metadata } from "next";
import "@/styles/globals.scss";
import { UpProvider } from "@/src/services/lukso/upProvider";
import AuroraBackground from "@/src/components/atoms/aurora-background";

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
        <UpProvider>
          <AuroraBackground>{children}</AuroraBackground>
        </UpProvider>
      </body>
    </html>
  );
}
