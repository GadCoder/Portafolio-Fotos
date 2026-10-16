export default function SeriesYear({ year }: { year?: number | null }) {
  if (year == null) return null;
  return <span className="series-year">{year}</span>;
}
