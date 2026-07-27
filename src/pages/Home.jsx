import { Link } from "react-router-dom";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="site-header-top">
          <Link className="brand" to="/">
            <span className="brand-mark">M</span>
            <span>MeepleMeter</span>
          </Link>
          <Link className="login-link" to="/login">
            Einloggen
          </Link>
        </div>
        <nav className="main-nav" aria-label="Hauptnavigation">
          <a href="#funktionen">Features</a>
          <a href="#ablauf">So funktioniert’s</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <p className="eyebrow">Für private Brettspielrunden</p>
            <h1>Sammlung, Partien und Statistiken an einem Ort.</h1>
            <p className="hero-copy">
              MeepleMeter hilft dir, deine Spiele zu verwalten, Partien zu
              dokumentieren und Trends in deiner Runde sichtbar zu machen.
            </p>
            <div className="hero-actions">
              <Link className="button" to="/register">
                Account erstellen
              </Link>
              <Link className="button button-secondary" to="/dashboard">
                Demo ansehen
              </Link>
            </div>
          </div>

        </section>

        <section id="funktionen" className="section">
          <div className="section-heading">
            <p className="eyebrow">Features</p>
            <h2>Fokus auf das, was Brettspielrunden brauchen.</h2>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <h3>Sammlung verwalten</h3>
              <p>Spiele mit Kategorie, Spielerzahl und vorgegebener Spielzeit erfassen.</p>
            </article>
            <article className="feature-card">
              <h3>Partien tracken</h3>
              <p>Datum, Mitspieler, Punkte, echte Dauer und Notizen dokumentieren.</p>
            </article>
            <article className="feature-card">
              <h3>Statistiken sehen</h3>
              <p>Meistgespielte Spiele, Durchschnittsdauer und Trends auswerten.</p>
            </article>
          </div>
        </section>

        <section id="ablauf" className="section split-section">
          <div>
            <p className="eyebrow">So funktioniert’s</p>
            <h2>Schnell erfassen, später auswerten.</h2>
          </div>
          <ol className="steps">
            <li>
              <strong>Spiel anlegen</strong>
              <span>Basisdaten zur Sammlung hinzufügen.</span>
            </li>
            <li>
              <strong>Partie speichern</strong>
              <span>Runde direkt nach dem Spielen dokumentieren.</span>
            </li>
            <li>
              <strong>Statistiken nutzen</strong>
              <span>Entscheiden, was beim nächsten Abend auf den Tisch kommt.</span>
            </li>
          </ol>
        </section>

      </main>
    </>
  );
}
