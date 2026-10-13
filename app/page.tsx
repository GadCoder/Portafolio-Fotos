import { getPhotos } from "@/app/api";
import PhotoGallery from "@/components/PhotoGallery";
import TopBar from "@/components/TopBar";
import ErrorComponent from "@/components/ErrorComponent";

export const dynamic = "force-static";

export default async function Home() {
  const photos = await getPhotos();
  const hasError = photos.length === 0;

  return (
    <main className="container-fluid px-5">
      <TopBar />
      {hasError ? (
        <ErrorComponent />
      ) : (
        <PhotoGallery photos={photos} />
      )}
    </main>
  );
}
