import { getPhotos } from "@/app/api";

import Photo from "@/components/Photo";
import TopBar from "@/components/TopBar";

import { ThemeProvider } from "next-themes";
import ErrorComponent from "@/components/ErrorComponent";

export const dynamic = "force-static";

type Photo = {
  id: number;
  is_horizontal: boolean;
  photo_url: string;
  name: string;
};


export default async function Home() {
  let photos: Photo[] = [];
  let error = false;

  try {
    photos = await getPhotos();
  } catch (err) {
    error = true;
  }
  const imageQuality = typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 45 : 70


  return (
    <ThemeProvider attribute="class">

      <main className="container-fluid px-5">
        <TopBar />
        {error ? (
          <ErrorComponent />
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 ">
            {photos.map((photo) => (
              <Photo
                key={photo.name}
                src={photo.photo_url}
                imageQuality={imageQuality}
                width={photo.is_horizontal ? 1200 : 800}
                height={photo.is_horizontal ? 800 : 1200}
              />
            ))}
          </div>
        )}
      </main>
    </ThemeProvider>

  );
}
