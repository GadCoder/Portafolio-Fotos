import { getPhotos } from "@/app/api";
import PhotoGallery from "@/components/PhotoGallery";
import TopBar from "@/components/TopBar";

export const dynamic = "force-static";

export default async function Home() {
  const photos = await getPhotos();

  return (
    <main className="page-shell" id="top">
      <TopBar />
      <section className="work-section" id="work" aria-label="Fotografías">
        <PhotoGallery photos={photos} />
      </section>
    </main>
  );
}
