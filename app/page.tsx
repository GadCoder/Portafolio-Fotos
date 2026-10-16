import Link from "next/link";
import { getSeries } from "@/app/api";
import PhotoGallery from "@/components/PhotoGallery";
import SeriesYear from "@/components/SeriesYear";
import TopBar from "@/components/TopBar";
import { homepageSeriesPhotos } from "@/lib/series-contract";

export const dynamic = "force-static";

export default async function Home() {
  const series = await getSeries();
  const firstImageSeries = series.find((item) => homepageSeriesPhotos(item).length > 0)?.slug;

  return (
    <main className="page-shell" id="top">
      <TopBar />
      <div className="series-list" id="work" aria-label="Series fotográficas">
        {series.length === 0 && <p className="series-empty">Todavía no hay series publicadas.</p>}
        {series.map((item) => {
          const photos = homepageSeriesPhotos(item);
          return (
            <section className="series-section" key={item.id} aria-labelledby={`series-${item.slug}`}>
              <header className="series-heading">
                <div>
                  <div className="series-title-line">
                    <SeriesYear year={item.year} />
                    <h2 id={`series-${item.slug}`}>{item.title}</h2>
                  </div>
                  {item.description && <p>{item.description}</p>}
                </div>
                {item.totalPhotos > 5 && (
                  <Link href={`/series/${item.slug}`} className="series-link">
                    Ver serie <span aria-hidden="true">→</span>
                  </Link>
                )}
              </header>
              <PhotoGallery photos={photos} prioritizeFirstImage={item.slug === firstImageSeries} />
            </section>
          );
        })}
      </div>
    </main>
  );
}
