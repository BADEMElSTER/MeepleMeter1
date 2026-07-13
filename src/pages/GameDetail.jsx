import { Link, Navigate, useParams } from "react-router-dom";
import GameLink from "../components/GameLink.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

export default function GameDetail() {
  const { gameId, gameTitle } = useParams();
  const { games, plays } = useAppData();
  const decodedTitle = gameTitle ? decodeURIComponent(gameTitle) : "";
  const game =
    games.find((entry) => entry.id === gameId) ??
    games.find((entry) => normalizeTitle(entry.title) === normalizeTitle(decodedTitle)) ??
    buildVirtualGame(decodedTitle, plays);

  if (!game) {
    return <Navigate to="/games" replace />;
  }

  const statistics = buildGameStatistics(game, plays);

  return (
    <section className="page">
      <div className="page-heading row-heading">
        <div>
          <p className="eyebrow">Spielstatistik</p>
          <h1>{game.title}</h1>
        </div>
        <Link className="ghost-button" to="/games">
          Zur Sammlung
        </Link>
      </div>

      <div className="metric-grid">
        <Metric label="Gespielte Partien" value={statistics.playCount} />
        <Metric label="Ø Spieldauer" value={formatMinutes(statistics.averageDuration)} />
        <Metric label="Häufigster Gewinner" value={formatPlayer(statistics.mostWinsPlayer)} />
        <Metric label="Häufigster Verlierer" value={formatPlayer(statistics.mostLossesPlayer)} />
      </div>

      <div className="panel-grid">
        <article className="panel">
          <h2>Spielerbilanz</h2>
          <div className="list">
            {statistics.players.map((player) => (
              <div className="list-row" key={player.name}>
                <div>
                  <strong>{player.name}</strong>
                  <span>
                    {player.plays} Partien · {player.wins} Siege · {player.losses} Niederlagen
                  </span>
                </div>
                <span>Ø Platz {formatPlacement(player.averagePlacement)}</span>
              </div>
            ))}
            {!statistics.players.length && <p className="empty-hint">Für dieses Spiel gibt es noch keine Partien.</p>}
          </div>
        </article>

        <article className="panel">
          <h2>Letzte Partien</h2>
          <div className="list">
            {statistics.plays.map((play) => (
              <div className="list-row" key={play.id}>
                <div>
                  <strong>{new Date(play.date).toLocaleDateString("de-DE")}</strong>
                  <span>
                    Gewinner: {play.winner} · {play.players} Spieler · {formatMinutes(play.duration)}
                  </span>
                </div>
              </div>
            ))}
            {!statistics.plays.length && <p className="empty-hint">Noch keine Partie erfasst.</p>}
          </div>
        </article>

        <article className="panel">
          <h2>Spielinfo</h2>
          <div className="list">
            <InfoRow label="Kategorie" value={game.category} />
            <InfoRow label="Spielerzahl" value={`${game.minPlayers}–${game.maxPlayers}`} />
            <InfoRow label="Vorgegebene Spielzeit" value={formatMinutes(game.duration)} />
            <InfoRow label="Erweiterungen" value={(game.expansions ?? []).map((entry) => entry.name).join(", ") || "–"} />
          </div>
        </article>

        <article className="panel highlight-panel">
          <p className="eyebrow">Direktlink</p>
          <h2>
            <GameLink gameId={game.id}>{game.title}</GameLink>
          </h2>
          <p>Jeder Spielname in der App führt künftig auf diese Auswertung.</p>
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

function buildGameStatistics(game, plays) {
  const matchingPlays = plays
    .filter(
      (play) =>
        play.gameId === game.id ||
        normalizeTitle(play.game) === normalizeTitle(game.title),
    )
    .toSorted((first, second) => new Date(second.date) - new Date(first.date));
  const playerMap = new Map();
  const totalDuration = matchingPlays.reduce((sum, play) => sum + Number(play.duration || 0), 0);

  for (const play of matchingPlays) {
    const placements = getPlayPlacements(play);
    const lossNames = getLossNames(play, placements);

    for (const participant of play.participants ?? []) {
      const player = playerMap.get(participant.name) ?? {
        name: participant.name,
        plays: 0,
        wins: 0,
        losses: 0,
        totalPlacement: 0,
        placementCount: 0,
      };

      player.plays += 1;
      if (play.winner === participant.name) player.wins += 1;
      if (lossNames.has(participant.name)) player.losses += 1;

      if (placements.has(participant.name)) {
        player.totalPlacement += placements.get(participant.name);
        player.placementCount += 1;
      }

      playerMap.set(participant.name, player);
    }
  }

  const players = [...playerMap.values()]
    .map((player) => ({
      ...player,
      averagePlacement: player.placementCount ? player.totalPlacement / player.placementCount : null,
    }))
    .toSorted((first, second) => second.plays - first.plays || second.wins - first.wins);

  return {
    playCount: matchingPlays.length,
    averageDuration: matchingPlays.length ? totalDuration / matchingPlays.length : null,
    mostWinsPlayer: players.toSorted((first, second) => second.wins - first.wins || second.plays - first.plays)[0],
    mostLossesPlayer: players.toSorted((first, second) => second.losses - first.losses || second.plays - first.plays)[0],
    players,
    plays: matchingPlays,
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

function getLossNames(play, placements) {
  if (placements.size) {
    const worstPlacement = Math.max(...placements.values());
    return new Set([...placements.entries()].filter((entry) => entry[1] === worstPlacement).map((entry) => entry[0]));
  }

  if (!play.winner || play.winner === "Nicht erfasst") {
    return new Set();
  }

  return new Set((play.participants ?? []).filter((participant) => participant.name !== play.winner).map((participant) => participant.name));
}

function formatMinutes(value) {
  return value ? `${Math.round(value)} Min.` : "–";
}

function formatPlacement(value) {
  return value === null || value === undefined ? "–" : Math.round(value * 10) / 10;
}

function formatPlayer(player) {
  return player?.name ?? "–";
}

function buildVirtualGame(title, plays) {
  if (!title) {
    return null;
  }

  const matchingPlays = plays.filter((play) => normalizeTitle(play.game) === normalizeTitle(title));

  if (!matchingPlays.length) {
    return null;
  }

  return {
    id: null,
    title,
    category: "Aus Partien",
    minPlayers: Math.min(...matchingPlays.map((play) => Number(play.players) || 1)),
    maxPlayers: Math.max(...matchingPlays.map((play) => Number(play.players) || 1)),
    duration: Math.round(
      matchingPlays.reduce((sum, play) => sum + Number(play.duration || 0), 0) / matchingPlays.length,
    ),
    expansions: [],
  };
}

function normalizeTitle(title = "") {
  return String(title).trim().toLowerCase();
}
