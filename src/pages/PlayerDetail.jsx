import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import GameLink from "../components/GameLink.jsx";
import PlayerLink from "../components/PlayerLink.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

export default function PlayerDetail() {
  const { playerName } = useParams();
  const { games, plays } = useAppData();
  const decodedName = playerName ? decodeURIComponent(playerName) : "";
  const statistics = useMemo(() => buildPlayerStatistics(decodedName, games, plays), [decodedName, games, plays]);
  const [activeTab, setActiveTab] = useState("info");
  const tabs = [
    { id: "info", label: "Allgemein" },
    { id: "stats", label: "Statistiken" },
    { id: "plays", label: "Letzte Spiele" },
  ];

  if (!statistics) {
    return <Navigate to="/stats" replace />;
  }

  return (
    <section className="page">
      <div className="page-heading row-heading">
        <div>
          <p className="eyebrow">Spielerdetails</p>
          <h1>{statistics.name}</h1>
        </div>
        <Link className="ghost-button" to="/stats">
          Zu Statistiken
        </Link>
      </div>

      <div className="stats-tabs detail-tabs" role="tablist" aria-label="Spielerstatistikbereiche">
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

      {activeTab === "info" && <InfoTab statistics={statistics} />}
      {activeTab === "stats" && <StatsTab statistics={statistics} />}
      {activeTab === "plays" && <PlaysTab statistics={statistics} />}
    </section>
  );
}

function InfoTab({ statistics }) {
  return (
    <>
      <div className="metric-grid">
        <Metric label="Partien insgesamt" value={statistics.totalPlays} />
        <Metric label="Siege" value={statistics.wins} />
        <Metric label="Ø Platzierung" value={formatPlacement(statistics.averagePlacement)} />
        <Metric label="Häufigstes Spiel" value={<GameLink title={statistics.mostPlayedGame?.title}>{statistics.mostPlayedGame?.title ?? "–"}</GameLink>} />
      </div>

      <article className="panel highlight-panel">
        <p className="eyebrow">Spieler</p>
        <h2>
          <PlayerLink name={statistics.name}>{statistics.name}</PlayerLink>
        </h2>
        <p>
          {statistics.totalPlays
            ? `${statistics.totalPlays} Partien erfasst, davon ${statistics.wins} Siege.`
            : "Für diesen Spieler wurden noch keine Partien erfasst."}
        </p>
      </article>
    </>
  );
}

function StatsTab({ statistics }) {
  return (
    <div className="panel-grid">
      <article className="panel">
        <h2>Kennzahlen</h2>
        <div className="list">
          <InfoRow label="Anzahl Spiele insgesamt" value={statistics.totalPlays} />
          <InfoRow label="Am häufigsten gespieltes Spiel" value={<GameLink title={statistics.mostPlayedGame?.title}>{statistics.mostPlayedGame?.title ?? "–"}</GameLink>} />
          <InfoRow label="Siege" value={statistics.wins} />
          <InfoRow label="Bestes Spiel nach Siegen" value={<GameLink title={statistics.bestWinningGame?.title}>{statistics.bestWinningGame ? `${statistics.bestWinningGame.title} (${statistics.bestWinningGame.wins} Siege)` : "–"}</GameLink>} />
          <InfoRow label="Durchschnittliche Platzierung" value={formatPlacement(statistics.averagePlacement)} />
        </div>
      </article>

      <article className="panel">
        <h2>Spiele dieses Spielers</h2>
        <div className="list">
          {statistics.games.map((game) => (
            <div className="list-row" key={game.title}>
              <div>
                <strong>
                  <GameLink title={game.title}>{game.title}</GameLink>
                </strong>
                <span>
                  {game.plays} Partien · {game.wins} Siege · Ø Platz {formatPlacement(game.averagePlacement)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

function PlaysTab({ statistics }) {
  return (
    <article className="panel">
      <h2>Letzte gespielte Spiele</h2>
      <div className="list">
        {statistics.latestPlays.map((play) => (
          <div className="list-row" key={play.id}>
            <div>
              <strong>
                <GameLink gameId={play.gameId} title={play.game} />
              </strong>
              <span>
                {new Date(play.date).toLocaleDateString("de-DE")} · Gewinner:{" "}
                <PlayerLink name={play.winner}>{play.winner}</PlayerLink> · {formatMinutes(play.duration)}
              </span>
            </div>
          </div>
        ))}
        {!statistics.latestPlays.length && <p className="empty-hint">Noch keine Partien erfasst.</p>}
      </div>
    </article>
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

function InfoRow({ label, value }) {
  return (
    <div className="list-row">
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
    </div>
  );
}

function buildPlayerStatistics(name, games, plays) {
  const playerName = name.trim();

  if (!playerName) {
    return null;
  }

  const matchingPlays = plays
    .filter((play) => (play.participants ?? []).some((participant) => sameName(participant.name, playerName)))
    .toSorted((first, second) => new Date(second.date) - new Date(first.date));

  if (!matchingPlays.length) {
    return null;
  }

  const gameMap = new Map();
  let wins = 0;
  let totalPlacement = 0;
  let placementCount = 0;

  for (const play of matchingPlays) {
    const participant = (play.participants ?? []).find((entry) => sameName(entry.name, playerName));
    const placement = getPlayPlacements(play).get(participant?.name);
    const gameTitle = play.game ?? "Unbekanntes Spiel";
    const game = gameMap.get(gameTitle) ?? {
      title: gameTitle,
      plays: 0,
      wins: 0,
      totalPlacement: 0,
      placementCount: 0,
    };

    game.plays += 1;

    if (sameName(play.winner, playerName)) {
      wins += 1;
      game.wins += 1;
    }

    if (placement !== undefined) {
      totalPlacement += placement;
      placementCount += 1;
      game.totalPlacement += placement;
      game.placementCount += 1;
    }

    gameMap.set(gameTitle, game);
  }

  const playerGames = [...gameMap.values()]
    .map((game) => ({
      ...game,
      averagePlacement: game.placementCount ? game.totalPlacement / game.placementCount : null,
    }))
    .toSorted((first, second) => second.plays - first.plays || second.wins - first.wins);

  return {
    name: playerName,
    totalPlays: matchingPlays.length,
    wins,
    averagePlacement: placementCount ? totalPlacement / placementCount : null,
    mostPlayedGame: playerGames[0] ?? null,
    bestWinningGame:
      playerGames.toSorted((first, second) => second.wins - first.wins || second.plays - first.plays)[0] ?? null,
    games: playerGames,
    latestPlays: matchingPlays,
  };
}

function getPlayPlacements(play) {
  const participants = (play.participants ?? []).filter(
    (participant) => participant.score !== null && participant.score !== undefined && participant.score !== "",
  );

  if (!participants.length || play.scoringMode === "none") {
    return new Map();
  }

  const sortedParticipants = participants.toSorted((first, second) => {
    if (play.scoringMode === "low" || play.scoringMode === "placement") {
      return Number(first.score) - Number(second.score);
    }

    return Number(second.score) - Number(first.score);
  });
  const placements = new Map();
  let currentPlacement = 1;

  for (let index = 0; index < sortedParticipants.length; index += 1) {
    const participant = sortedParticipants[index];
    const previousParticipant = sortedParticipants[index - 1];

    if (previousParticipant && Number(previousParticipant.score) !== Number(participant.score)) {
      currentPlacement = index + 1;
    }

    placements.set(participant.name, currentPlacement);
  }

  return placements;
}

function sameName(firstName = "", secondName = "") {
  return firstName.trim().toLowerCase() === secondName.trim().toLowerCase();
}

function formatMinutes(value) {
  return value ? `${Math.round(value)} Min.` : "–";
}

function formatPlacement(value) {
  return value === null || value === undefined ? "–" : Math.round(value * 10) / 10;
}
