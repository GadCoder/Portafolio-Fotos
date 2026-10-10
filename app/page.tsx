import { getPhotos } from "@/app/api";
import Photo from "@/components/Photo";
import TopBar from "@/components/TopBar";
import { Providers } from "@/components/Providers";
import ErrorComponent from "@/components/ErrorComponent";

export const dynamic = "force-static";

export default async function Home() {
  const photos = await getPhotos();
  const hasError = photos.length === 0;

  return (
    <Providers>
      <main className="container-fluid px-5">
        <TopBar />
        {hasError ? (
          <ErrorComponent />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-6">
            {photos.map((photo) => (
              <Photo
                key={photo.id}
                src={photo.photo_url}
                alt={photo.name}
                width={photo.is_horizontal ? 1200 : 800}
                height={photo.is_horizontal ? 800 : 1200}
              />
            ))}
          </div>
        )}
      </main>
    </Providers>
  );
}
