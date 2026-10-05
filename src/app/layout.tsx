import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Easy Learn",
  description: "Learn anything, calmly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
