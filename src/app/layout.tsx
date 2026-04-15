import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IMD Store Log System",
  description: "Internal purchase logbook — Indian Meteorological Department",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
