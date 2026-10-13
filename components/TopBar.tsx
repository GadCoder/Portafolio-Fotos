export default function TopBar() {
  return (
    <>
      <header className="site-header">
        <a className="site-label" href="#top" aria-label="Inicio del portafolio fotográfico">
          Portafolio fotográfico
        </a>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#work" className="active" aria-current="page">
            Fotografías
          </a>
          <a href="#work">Series</a>
          <a href="#about">Sobre mí</a>
        </nav>
      </header>

      <section className="introduction" id="about" aria-labelledby="photographer-name">
        <h1 className="portfolio-title" id="photographer-name">
          Germán Ampuero
        </h1>
        <div className="introduction-meta">
          <p>A veces tomo fotos.</p>
          <p className="location">Lima, Perú — 2026</p>
        </div>
      </section>
    </>
  );
}
