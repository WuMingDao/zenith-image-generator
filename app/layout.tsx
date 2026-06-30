import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Zenith Image Generator",
  description: "an multi-provider image ai generator with Next.js page.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-mono", jetbrainsMono.variable)}>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
