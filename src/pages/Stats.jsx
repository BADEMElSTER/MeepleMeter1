import { useMemo, useState } from "react";
import { useAppData } from "../data/AppDataContext.jsx";

const tabs = [
  { id: "personal", label: "Persönlich" },
  { id: "games", label: "Spiele" },
  { id: "group", label: "Gruppe" },
];

export default function Stats() {
  const { games, plays, stats } = useAppData();
  const [activeTab, setActiveTab] = useState("personal");
  const analytics = useMemo(() => buildAnalytics(games, plays, stats), [games, plays, stats]);

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Statistiken</p>
        <h1>Auswertung deiner Spielrunde.</h1>
      </div>

      <div className="stats-tabs" role="tablist" aria-label="Statistikbereiche">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? "active" : ""}
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "personal" && <PersonalStats analytics={analytics} />}
      {activeTab === "games" && <GameStats analytics={analytics} />}
      {activeTab === "group" && <GroupStats analytics={analytics} />}
    </section>
  );
}

function PersonalStats({ analytics }) {
  const maxPlays = Math.max(...analytics.players.map((player) => player.plays), 1);

  return (
    <>
      <div className="metric-grid">
        <Metric label="Aktive Mitspieler" value={analytics.players.length} />
        <Metric label="Häufigster Spieler" value={analytics.topPlayer?.name ?? "–"} />
        <Metric label="Beste Gewinnquote" value={formatPercent(analytics.bestWinRate?.winRate)} />
        <Metric label="Ø Punkte pro Partie" value={formatNumber(analytics.averageScore)} />
      </div>

      <div className="panel-grid">
        <article className="panel">
          <h2>Mitspieler nach Aktivität</h2>
          <div className="chart-list">
            {analytics.players.map((player) => (
              <ChartRow
                key={player.name}
                label={player.name}
                meta={`${player.plays} Partien · ${player.wins} Siege`}
                percent={(player.plays / maxPlays) * 100}
              />
            ))}
            {!analytics.players.length && <p className="empty-hint">Noch keine Mitspieler erfasst.</p>}
          </div>
        </article>

        <article className="panel">
          <h2>Persönliche Rangliste</h2>
          <div className="list">
            {analytics.players.slice(0, 8).map((player) => (
              <div className="list-row" key={player.name}>
                <div>
                  <strong>{player.name}</strong>
                  <span>
                    {formatPercent(player.winRate)} Gewinnquote · Ø {formatNumber(player.averageScore)} Punkte
                  </span>
                </div>
                <span>{player.wins} Siege</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </>
  );
}

function GameStats({ analytics }) {
  const maxPlays = Math.max(...analytics.games.map((game) => game.plays), 1);

  return (
    <>
      <div className="metric-grid">
        <Metric label="Spiele in Sammlung" value={analytics.totalGames} />
        <Metric label="Gespielte Spiele" value={analytics.playedGames} />
        <Metric label="Ungespielte Spiele" value={analytics.unplayedGames} />
        <Metric label="Meistgespielt" value={analytics.mostPlayedGame?.title ?? "–"} />
      </div>

      <div className="panel-grid">
        <article className="panel">
          <h2>Meistgespielte Spiele</h2>
          <div className="chart-list">
            {analytics.games.map((game) => (
              <ChartRow
                key={game.id}
                label={game.title}
                meta={`${game.plays} Partien · Ø ${formatMinutes(game.averagePlayedDuration)}`}
                percent={(game.plays / maxPlays) * 100}
              />
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Spiele ohne Partie</h2>
          <div className="list">
            {analytics.unplayedGameList.slice(0, 8).map((game) => (
              <div className="list-row" key={game.id}>
                <div>
                  <strong>{game.title}</strong>
                  <span>
                    {game.minPlayers}–{game.maxPlayers} Spieler · {game.duration} Min.
                  </span>
                </div>
              </div>
            ))}
            {!analytics.unplayedGameList.length && <p className="empty-hint">Alle Spiele wurden bereits gespielt.</p>}
          </div>
        </article>
      </div>
    </>
  );
}

function GroupStats({ analytics }) {
  return (
    <>
      <div className="metric-grid">
        <Metric label="Erfasste Partien" value={analytics.totalPlays} />
        <Metric label="Ø Spieldauer" value={formatMinutes(analytics.averageDuration)} />
        <Metric label="Ø Spielerzahl" value={formatNumber(analytics.averagePlayerCount)} />
        <Metric label="Gesamtspielzeit" value={formatHours(analytics.totalDuration)} />
      </div>

      <div className="panel-grid">
        <article className="panel">
          <h2>Spielzeit nach Spieleranzahl</h2>
          <div className="list">
            {analytics.durationByPlayerCount.map((group) => (
              <div className="list-row" key={group.playerCount}>
                <div>
                  <strong>{group.playerCount} Spieler</strong>
                  <span>{group.playCount} Partien</span>
                </div>
                <span>Ø {formatMinutes(group.averageDuration)}</span>
              </div>
            ))}
            {!analytics.durationByPlayerCount.length && <p className="empty-hint">Noch keine Partien erfasst.</p>}
          </div>
        </article>

        <article className="panel">
          <h2>Letzte Gewinner</h2>
          <div className="list">
            {analytics.latestWinners.map((play) => (
              <div className="list-row" key={play.id}>
                <div>
                  <strong>{play.winner}</strong>
                  <span>
                    {play.game} · {new Date(play.date).toLocaleDateString("de-DE")}
                  </span>
                </div>
              </div>
            ))}
            {!analytics.latestWinners.length && <p className="empty-hint">Noch keine Gewinner erfasst.</p>}
          </div>
        </article>
      </div>
    </>
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

function ChartRow({ label, meta, percent }) {
  return (
    <div className="chart-row">
      <div>
        <strong>{label}</strong>
        <span>{meta}</span>
      </div>
      <div className="bar">
        <span style={{ width: `${Math.max(percent, 4)}%` }} />
      </div>
    </div>
  );
}

function buildAnalytics(games, plays, stats) {
  const playerMap = new Map();
  let totalScore = 0;
  let scoredResults = 0;

  for (const play of plays) {
    for (const participant of play.participants ?? []) {
      const player = playerMap.get(participant.name) ?? {
        name: participant.name,
        plays: 0,
        wins: 0,
        totalScore: 0,
        scoredPlays: 0,
      };

      player.plays += 1;
      if (play.winner === participant.name) player.wins += 1;

      if (participant.score !== null && participant.score !== undefined && participant.score !== "") {
        player.totalScore += Number(participant.score) || 0;
        player.scoredPlays += 1;
        totalScore += Number(participant.score) || 0;
        scoredResults += 1;
      }

      playerMap.set(participant.name, player);
    }
  }

  const players = [...playerMap.values()]
    .map((player) => ({
      ...player,
      winRate: player.plays ? player.wins / player.plays : 0,
      averageScore: player.scoredPlays ? player.totalScore / player.scoredPlays : null,
    }))
    .toSorted((first, second) => second.plays - first.plays || second.wins - first.wins);

  const gamesWithCounts = stats.gamesWithPlayCounts.toSorted(
    (first, second) => second.plays - first.plays || first.title.localeCompare(second.title),
  );
  const totalDuration = plays.reduce((sum, play) => sum + Number(play.duration || 0), 0);
  const totalPlayerCount = plays.reduce((sum, play) => sum + Number(play.players || 0), 0);

  return {
    totalGames: games.length,
    totalPlays: plays.length,
    totalDuration,
    averageDuration: stats.averageDuration,
    averagePlayerCount: plays.length ? totalPlayerCount / plays.length : 0,
    averageScore: scoredResults ? totalScore / scoredResults : null,
    durationByPlayerCount: stats.durationByPlayerCount,
    games: gamesWithCounts,
    playedGames: gamesWithCounts.filter((game) => game.plays > 0).length,
    unplayedGames: gamesWithCounts.filter((game) => game.plays === 0).length,
    unplayedGameList: gamesWithCounts.filter((game) => game.plays === 0),
    players,
    topPlayer: players[0] ?? null,
    bestWinRate:
      players
        .filter((player) => player.plays >= 2)
        .toSorted((first, second) => second.winRate - first.winRate || second.wins - first.wins)[0] ??
      null,
    mostPlayedGame: stats.mostPlayedGame,
    latestWinners: plays.filter((play) => play.winner && play.winner !== "Nicht erfasst").slice(0, 8),
  };
}

function formatMinutes(value) {
  return value ? `${Math.round(value)} Min.` : "–";
}

function formatHours(value) {
  if (!value) return "–";
  return `${Math.round((value / 60) * 10) / 10} Std.`;
}

function formatPercent(value) {
  return value === null || value === undefined ? "–" : `${Math.round(value * 100)} %`;
}

function formatNumber(value) {
  return value === null || value === undefined ? "–" : Math.round(value * 10) / 10;
}
