import { useAppData } from "../data/AppDataContext.jsx";

export default function Stats() {
  const { stats } = useAppData();
  const games = stats.gamesWithPlayCounts;
  const maxPlays = Math.max(...games.map((game) => game.plays), 1);

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
          <p>Durchschnittliche echte Dauer der erfassten Partien.</p>
          <h2>{stats.mostPlayedGame.title}</h2>
          <p>Aktuell meistgespieltes Spiel deiner Runde.</p>
        </article>

        <article className="panel">
          <h2>Spielzeit nach Spieleranzahl</h2>
          <div className="list">
            {stats.durationByPlayerCount.map((group) => (
              <div className="list-row" key={group.playerCount}>
                <div>
                  <strong>{group.playerCount} Spieler</strong>
                  <span>{group.playCount} Partien</span>
                </div>
                <span>{group.averageDuration} Min.</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
