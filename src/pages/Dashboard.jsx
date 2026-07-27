import { Link } from "react-router-dom";
import GameLink from "../components/GameLink.jsx";
import PlayerLink from "../components/PlayerLink.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

export default function Dashboard() {
  const { userProfile } = useAuth();
  const { plays, stats } = useAppData();
  const username = userProfile?.username || userProfile?.displayName;
  const normalizedUsername = username?.trim().toLowerCase() ?? "";
  const personalPlays = normalizedUsername
    ? plays.filter((play) =>
        play.participants?.some(
          (participant) => participant.name.trim().toLowerCase() === normalizedUsername,
        ),
      )
    : plays;

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Dashboard</p>
        <h1>{username ? `Willkommen, ${username}.` : "Deine Brettspielrunde auf einen Blick."}</h1>
        {username && <p className="page-intro">Deine Brettspielrunde auf einen Blick.</p>}
      </div>

      <div className="metric-grid">
        <Metric label="Spiele in Sammlung" value={stats.totalGames} />
        <Metric label="Erfasste Partien" value={stats.totalPlays} />
        <Metric label="Ø gespielte Dauer" value={`${stats.averageDuration} Min.`} />
        <Metric
          label="Meistgespielt"
          value={
            <GameLink gameId={stats.mostPlayedGame.id}>{stats.mostPlayedGame.title}</GameLink>
          }
        />
      </div>

      <div className="panel-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>{username ? "Meine letzten Partien" : "Letzte Partien"}</h2>
            <Link to="/plays">Alle ansehen</Link>
          </div>
          <div className="list">
            {personalPlays.length ? (
              personalPlays.map((play) => (
                <div className="list-row" key={play.id}>
                  <div>
                    <strong>
                      <GameLink gameId={play.gameId} title={play.game} />
                    </strong>
                    <span>{new Date(play.date).toLocaleDateString("de-DE")}</span>
                  </div>
                  <span>
                    <PlayerLink name={play.winner}>{play.winner}</PlayerLink>
                  </span>
                </div>
              ))
            ) : (
              <p className="page-intro">
                Für {username} wurden noch keine eigenen Partien erfasst.
              </p>
            )}
          </div>
        </article>

        <article className="panel highlight-panel">
          <p className="eyebrow">Empfehlung</p>
          <h2>
            <GameLink gameId={stats.mostPlayedGame.id}>{stats.mostPlayedGame.title}</GameLink>
          </h2>
          <p>
            Aktuell das meistgespielte Spiel deiner Runde mit {stats.mostPlayedGame.plays} Partien.
          </p>
          <p className="todo-note">
            TODO später: Wenn Nutzer angemeldet sind, persönliche und Gruppen-Empfehlungen
            vorschlagen, z. B. noch nie gespielt, noch nie gewonnen oder länger als ein Jahr nicht
            gespielt.
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
