import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArchGen — AI AWS Architecture Diagrams",
  description:
    "Describe a system in plain English and get an editable AWS architecture diagram, powered by Grok.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-full">{children}</body>
    </html>
  );
}
