import { Link } from "react-router-dom";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark">M</span>
          <span>MeepleMeter</span>
        </Link>
        <nav className="main-nav" aria-label="Hauptnavigation">
          <a href="#funktionen">Funktionen</a>
          <a href="#ablauf">Ablauf</a>
          <a href="#mvp">MVP</a>
        </nav>
        <div className="header-actions">
          <Link className="login-link" to="/login">
            Einloggen
          </Link>
          <Link className="button button-small" to="/register">
            Kostenlos starten
          </Link>
        </div>
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

          <div className="hero-card">
            <div className="card-header">
              <span className="status-dot"></span>
              <span>Rundenübersicht</span>
            </div>
            <div className="game-preview">
              <div>
                <p className="label">Meistgespielt</p>
                <strong>Cascadia</strong>
              </div>
              <div>
                <p className="label">Ø Spielzeit</p>
                <strong>65 Min.</strong>
              </div>
            </div>
            <div className="meter">
              <span style={{ width: "88%" }}></span>
            </div>
            <ul className="stats-list">
              <li>
                <span>Spiele</span>
                <strong>24</strong>
              </li>
              <li>
                <span>Partien</span>
                <strong>118</strong>
              </li>
              <li>
                <span>Mitspieler</span>
                <strong>9</strong>
              </li>
            </ul>
          </div>
        </section>

        <section id="funktionen" className="section">
          <div className="section-heading">
            <p className="eyebrow">Kernnutzen</p>
            <h2>Fokus auf das, was private Runden brauchen.</h2>
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
            <p className="eyebrow">Ablauf</p>
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

        <section id="mvp" className="cta-section">
          <h2>Demo mit Mock-Daten ansehen.</h2>
          <p>Die App-Struktur steht ohne Backend. Auth und Datenbank folgen später.</p>
          <Link className="button" to="/dashboard">
            Zum Dashboard
          </Link>
        </section>
      </main>
    </>
  );
}
