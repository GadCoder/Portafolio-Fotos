import { getPhotos } from "@/app/api";

import TopBar from "@/components/TopBar";
import Photo from "@/components/Photo";
import ErrorComponent from "@/components/ErrorComponent";

export const dynamic = "force-static";

export default async function Home() {
  let photos = [];
  let error = false;

  try {
    photos = await getPhotos();
  } catch (err) {
    error = true;
  }

  return (
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
              imageQuality={typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 45 : 70}
            />
          ))}
        </div>
      )}
    </main>
  );
}
