import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeries, getSeriesDetail } from "@/app/api";
import PhotoGallery from "@/components/PhotoGallery";
import SeriesYear from "@/components/SeriesYear";

function getSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portfolio.gadcoder.com";
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute site origin");
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password || (url.pathname !== "/" && url.pathname !== "")) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without credentials or a path");
  }
  return url.origin;
}

const siteUrl = getSiteOrigin();
export const dynamicParams = false;

type PageProps = { params: Promise<{ slug: string }> };
const EMPTY_SERIES_SENTINEL = "__empty__";

export async function generateStaticParams() {
  const series = await getSeries();
  return series.length ? series.map(({ slug }) => ({ slug })) : [{ slug: EMPTY_SERIES_SENTINEL }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === EMPTY_SERIES_SENTINEL) notFound();
  const series = await getSeriesDetail(slug);
  return {
    title: `${series.title} — Germán Ampuero`,
    description: series.description || `Serie fotográfica ${series.title} de Germán Ampuero.`,
    alternates: { canonical: `${siteUrl}/series/${series.slug}` },
    openGraph: {
      title: `${series.title} — Germán Ampuero`,
      description: series.description || `Serie fotográfica ${series.title} de Germán Ampuero.`,
      url: `${siteUrl}/series/${series.slug}`,
      type: "website",
    },
  };
}

export default async function SeriesPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug === EMPTY_SERIES_SENTINEL) notFound();
  const series = await getSeriesDetail(slug);

  return (
    <main className="page-shell series-detail" id="top">
      <header className="site-header">
        <Link className="site-label" href="/">Portafolio fotográfico</Link>
        <nav className="site-nav" aria-label="Navegación principal">
          <Link href="/">Todas las series</Link>
          <Link href="/#about">Sobre mí</Link>
        </nav>
      </header>
      <section className="series-detail-heading" aria-labelledby="series-title">
        <Link className="back-link" href="/">← Todas las series</Link>
        <div className="series-title-line">
          <SeriesYear year={series.year} />
          <h1 className="portfolio-title" id="series-title">{series.title}</h1>
        </div>
        {series.description && <p>{series.description}</p>}
      </section>
      <PhotoGallery photos={series.photos} />
    </main>
  );
}
