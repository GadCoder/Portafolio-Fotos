"use client";
import { ThemeProvider } from "next-themes";

import TopBar from "@/components/TopBar";
import PhotosContainer from "@/components/PhotosContainer";

export default function Home() {
  return (
    <ThemeProvider attribute="class">
      <main className="container mx-auto p-4 md:p-1 md:pb-8">
        <TopBar />
        <PhotosContainer />
      </main>
    </ThemeProvider>
  );
}
