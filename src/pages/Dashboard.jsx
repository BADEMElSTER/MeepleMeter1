import { Link } from "react-router-dom";
import { plays, stats } from "../data/mockData.js";

export default function Dashboard() {
  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Demo Dashboard</p>
        <h1>Deine Brettspielrunde auf einen Blick.</h1>
      </div>

      <div className="metric-grid">
        <Metric label="Spiele in Sammlung" value={stats.totalGames} />
        <Metric label="Erfasste Partien" value={stats.totalPlays} />
        <Metric label="Ø Dauer" value={`${stats.averageDuration} Min.`} />
        <Metric label="Top Spiel" value={stats.favoriteGame.title} />
      </div>

      <div className="panel-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Letzte Partien</h2>
            <Link to="/plays">Alle ansehen</Link>
          </div>
          <div className="list">
            {plays.map((play) => (
              <div className="list-row" key={play.id}>
                <div>
                  <strong>{play.game}</strong>
                  <span>{new Date(play.date).toLocaleDateString("de-DE")}</span>
                </div>
                <span>{play.winner}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel highlight-panel">
          <p className="eyebrow">Empfehlung</p>
          <h2>{stats.mostPlayedGame.title}</h2>
          <p>
            Aktuell das meistgespielte Spiel deiner Runde mit{" "}
            {stats.mostPlayedGame.plays} Partien.
          </p>
          <Link className="button button-secondary" to="/stats">
            Statistik öffnen
          </Link>
        </article>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
