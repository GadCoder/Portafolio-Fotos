"use client";
import { ThemeProvider } from "next-themes";

import TopBar from "@/components/TopBar";
import PhotosContainer from "@/components/PhotosContainer";

export default function Home() {
  return (
    <ThemeProvider attribute="class">
      <main className="container-fluid px-5 ">
        <TopBar />
        <PhotosContainer />
      </main>
    </ThemeProvider>
  );
}
