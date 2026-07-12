import { games, stats } from "../data/mockData.js";

export default function Stats() {
  const maxPlays = Math.max(...games.map((game) => game.plays));

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Statistiken</p>
        <h1>Trends deiner Runde.</h1>
      </div>

      <div className="panel-grid">
        <article className="panel">
          <h2>Meistgespielte Spiele</h2>
          <div className="chart-list">
            {games
              .toSorted((a, b) => b.plays - a.plays)
              .map((game) => (
                <div className="chart-row" key={game.id}>
                  <div>
                    <strong>{game.title}</strong>
                    <span>{game.plays} Partien</span>
                  </div>
                  <div className="bar">
                    <span style={{ width: `${(game.plays / maxPlays) * 100}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </article>

        <article className="panel highlight-panel">
          <p className="eyebrow">Kennzahlen</p>
          <h2>{stats.averageDuration} Minuten</h2>
          <p>Durchschnittliche Dauer der zuletzt erfassten Partien.</p>
          <h2>{stats.favoriteGame.rating.toFixed(1)} / 10</h2>
          <p>Beste aktuelle Bewertung: {stats.favoriteGame.title}.</p>
        </article>
      </div>
    </section>
  );
}
