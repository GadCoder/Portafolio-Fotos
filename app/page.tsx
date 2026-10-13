import { getPhotos } from "@/app/api";
import PhotoGallery from "@/components/PhotoGallery";
import TopBar from "@/components/TopBar";
import ErrorComponent from "@/components/ErrorComponent";

export const dynamic = "force-static";

export default async function Home() {
  const photos = await getPhotos();
  const hasError = photos.length === 0;

  return (
    <main className="page-shell" id="top">
      <TopBar />
      {hasError ? (
        <ErrorComponent />
      ) : (
        <section className="work-section" id="work" aria-label="Fotografías">
          <PhotoGallery photos={photos} />
        </section>
      )}
    </main>
  );
}
