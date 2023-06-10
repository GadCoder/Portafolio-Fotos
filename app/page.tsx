"use client";
import { ThemeProvider } from "next-themes";

import TopBar from "@/components/TopBar";
import PhotosContainer from "@/components/PhotosContainer";

export default function Home() {
  return (
    <ThemeProvider attribute="class">
      <main className="container mx-auto p-5 md:p-2 md:pb-10">
        <TopBar />
        <PhotosContainer />
      </main>
    </ThemeProvider>
  );
}
