import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import GameLink from "../components/GameLink.jsx";
import PlayerLink from "../components/PlayerLink.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

export default function GameDetail() {
  const { gameId, gameTitle } = useParams();
  const { games, plays } = useAppData();
  const [activeTab, setActiveTab] = useState("overview");
  const decodedTitle = gameTitle ? decodeURIComponent(gameTitle) : "";
  const game =
    games.find((entry) => entry.id === gameId) ??
    games.find((entry) => normalizeTitle(entry.title) === normalizeTitle(decodedTitle)) ??
    buildVirtualGame(decodedTitle, plays);

  if (!game) {
    return <Navigate to="/games" replace />;
  }

  const statistics = buildGameStatistics(game, plays);
  const tabs = [
    { id: "overview", label: "Übersicht" },
    { id: "info", label: "Spielinfo" },
    { id: "players", label: "Spieler" },
    { id: "plays", label: "Partien" },
  ];

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

      <div className="stats-tabs detail-tabs" role="tablist" aria-label="Spielstatistikbereiche">
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

      {activeTab === "overview" && <OverviewTab game={game} statistics={statistics} />}
      {activeTab === "info" && <InfoTab game={game} />}
      {activeTab === "players" && <PlayersTab statistics={statistics} />}
      {activeTab === "plays" && <PlaysTab statistics={statistics} />}
    </section>
  );
}

function OverviewTab({ game, statistics }) {
  return (
    <>
      <div className="metric-grid">
        <Metric label="Gespielte Partien" value={statistics.playCount} />
        <Metric label="Ø Spieldauer" value={formatMinutes(statistics.averageDuration)} />
        <Metric
          label="Häufigster Sieger"
          value={formatPlayerWithCount(statistics.mostWinsPlayer, "wins", "Sieg", "Siege")}
        />
        <Metric
          label="Häufigster Verlierer"
          value={formatPlayerWithCount(
            statistics.mostLossesPlayer,
            "losses",
            "Niederlage",
            "Niederlagen",
          )}
        />
        <Metric
          label="Durchschnittliche Punkte zum Sieg"
          value={formatAverageWinningScore(statistics.scoreRecords)}
        />
        <Metric
          label="Sieg mit meisten Punkten"
          value={formatScoreRecord(statistics.scoreRecords.highestWinningScore)}
        />
        <Metric
          label="Sieg mit wenigsten Punkten"
          value={formatScoreRecord(statistics.scoreRecords.lowestWinningScore)}
        />
        <Metric
          label="Verlierer mit meisten Punkten"
          value={formatScoreRecord(statistics.scoreRecords.highestLosingScore)}
        />
        <Metric
          label="Verlierer mit wenigsten Punkten"
          value={formatScoreRecord(statistics.scoreRecords.lowestLosingScore)}
        />
      </div>

      <div className="panel-grid">
        <article className="panel">
          <h2>Spieldauer nach Spieleranzahl</h2>
          <DurationScale groups={statistics.durationByPlayerCount} maxDuration={statistics.maxDuration} />
        </article>

        <article className="panel highlight-panel">
          <p className="eyebrow">Kurzfazit</p>
          <h2>
            <GameLink gameId={game.id} title={game.title}>{game.title}</GameLink>
          </h2>
          <p>
            {statistics.playCount
              ? `${statistics.playCount} Partien erfasst. Durchschnittliche Dauer: ${formatMinutes(statistics.averageDuration)}.`
              : "Für dieses Spiel wurden noch keine Partien erfasst."}
          </p>
        </article>
      </div>
    </>
  );
}

function DurationScale({ groups, maxDuration }) {
  const scaleMax = Math.max(maxDuration, 1);
  const ticks = buildDurationTicks(scaleMax);

  if (!groups.length) {
    return <p className="empty-hint">Noch keine Spieldauern mit Spieleranzahl erfasst.</p>;
  }

  return (
    <div className="combined-duration-scale">
      <div
        aria-label={`Gemeinsame Skala der durchschnittlichen Spieldauer nach Spieleranzahl. Skala von 0 bis ${formatMinutes(scaleMax)}.`}
        className="duration-scale"
        title={`Skala von 0 bis ${formatMinutes(scaleMax)}`}
      >
        <span className="duration-scale-line" />
        {ticks.map((tick) => (
          <span
            aria-hidden="true"
            className={tick.isMajor ? "duration-tick duration-tick-major" : "duration-tick"}
            key={tick.value}
            style={{ left: `${getScalePosition(tick.value, scaleMax)}%` }}
            title={formatMinutes(tick.value)}
          >
            {tick.isMajor && <small>{tick.value}</small>}
          </span>
        ))}
        {groups.map((group) => {
          const markerTitle = `${group.playerCount} Spieler \u00b7 \u00d8 ${formatMinutes(group.averageDuration)} \u00b7 ${group.durations.length} Partien \u00b7 k\u00fcrzeste Partie ${formatMinutes(group.minDuration)} \u00b7 l\u00e4ngste Partie ${formatMinutes(group.maxDuration)}`;

          return (
            <button
              aria-label={markerTitle}
              className="duration-average-marker combined-duration-marker"
              key={group.playerCount}
              style={{ left: `${getScalePosition(group.averageDuration, scaleMax)}%` }}
              title={markerTitle}
              type="button"
            >
              <span>{group.playerCount}P</span>
              <small>{formatMinutes(group.averageDuration)}</small>
            </button>
          );
        })}
      </div>
      <div className="duration-scale-labels">
        <span>0 Min.</span>
        <span>{formatMinutes(scaleMax)}</span>
      </div>
    </div>
  );
}

function buildDurationTicks(maxDuration) {
  const roundedMax = Math.ceil(maxDuration / 30) * 30;
  const ticks = [];

  for (let value = 30; value <= roundedMax; value += 30) {
    ticks.push({ value, isMajor: value % 60 === 0 });
  }

  return ticks;
}

function getScalePosition(value, maxValue) {
  const position = maxValue ? (value / maxValue) * 100 : 0;
  return Math.min(Math.max(position, 8), 92);
}

function InfoTab({ game }) {
  return (
    <article className="panel">
      <h2>Allgemeine Spielinformationen</h2>
      <div className="list">
        {game.germanTitle && <InfoRow label="Deutscher Titel" value={game.germanTitle} />}
        {game.germanTitle && <InfoRow label="Originaltitel" value={game.catalogOriginalTitle || game.title} />}
        <InfoRow label="Kategorie" value={game.category} />
        <InfoRow label="Spielerzahl" value={`${game.minPlayers}–${game.maxPlayers}`} />
        <InfoRow label="Vorgegebene Spielzeit" value={formatMinutes(game.duration)} />
        <InfoRow label="Erweiterungen" value={(game.expansions ?? []).map((entry) => entry.name).join(", ") || "–"} />
      </div>
    </article>
  );
}

function PlayersTab({ statistics }) {
  return (
    <article className="table-card">
      <h2>Spielerstatistiken</h2>
      <table>
        <thead>
          <tr>
            <th>Spieler</th>
            <th>Partien</th>
            <th>Siege</th>
            <th>Niederlagen</th>
            <th>Ø Platz</th>
          </tr>
        </thead>
        <tbody>
          {statistics.players.map((player) => (
            <tr key={player.name}>
              <td>
                <strong>
                  <PlayerLink name={player.name}>{player.name}</PlayerLink>
                </strong>
              </td>
              <td>{player.plays}</td>
              <td>{player.wins}</td>
              <td>{player.losses}</td>
              <td>{formatPlacement(player.averagePlacement)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!statistics.players.length && <p className="empty-hint">Für dieses Spiel gibt es noch keine Partien.</p>}
    </article>
  );
}

function PlaysTab({ statistics }) {
  return (
    <article className="panel">
      <h2>Partien dieses Spiels</h2>
      <div className="list">
        {statistics.plays.map((play) => (
          <div className="list-row" key={play.id}>
            <div>
              <strong>{new Date(play.date).toLocaleDateString("de-DE")}</strong>
              <span>
                Gewinner: <PlayerLink name={play.winner}>{play.winner}</PlayerLink> · {play.players} Spieler · {formatMinutes(play.duration)}
              </span>
            </div>
          </div>
        ))}
        {!statistics.plays.length && <p className="empty-hint">Noch keine Partie erfasst.</p>}
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

function buildGameStatistics(game, plays) {
  const matchingPlays = plays
    .filter(
      (play) =>
        play.gameId === game.id ||
        normalizeTitle(play.game) === normalizeTitle(game.title),
    )
    .sort((first, second) => new Date(second.date) - new Date(first.date));
  const playerMap = new Map();
  const durationByPlayerCountMap = new Map();
  const scoreRecords = buildInitialScoreRecords();
  const totalDuration = matchingPlays.reduce((sum, play) => sum + Number(play.duration || 0), 0);

  for (const play of matchingPlays) {
    const placements = getPlayPlacements(play);
    const lossNames = getLossNames(play, placements);
    const duration = Number(play.duration || 0);
    const playerCount = Number(play.players || play.participants?.length || 0);
    updateScoreRecords(scoreRecords, play);

    if (duration > 0 && playerCount > 0) {
      const durationGroup = durationByPlayerCountMap.get(playerCount) ?? {
        playerCount,
        durations: [],
        totalDuration: 0,
      };

      durationGroup.durations.push(duration);
      durationGroup.totalDuration += duration;
      durationByPlayerCountMap.set(playerCount, durationGroup);
    }

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
    .sort((first, second) => second.plays - first.plays || second.wins - first.wins);
  const durationByPlayerCount = [...durationByPlayerCountMap.values()]
    .map((group) => ({
      ...group,
      averageDuration: group.totalDuration / group.durations.length,
      durations: [...group.durations].sort((first, second) => first - second),
      minDuration: Math.min(...group.durations),
      maxDuration: Math.max(...group.durations),
    }))
    .sort((first, second) => first.playerCount - second.playerCount);
  const maxDuration = Math.max(...durationByPlayerCount.flatMap((group) => group.durations), 0);

  return {
    playCount: matchingPlays.length,
    averageDuration: matchingPlays.length ? totalDuration / matchingPlays.length : null,
    mostWinsPlayer: [...players].sort((first, second) => second.wins - first.wins || second.plays - first.plays)[0],
    mostLossesPlayer: [...players].sort((first, second) => second.losses - first.losses || second.plays - first.plays)[0],
    scoreRecords,
    durationByPlayerCount,
    maxDuration,
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

  const sortedParticipants = [...participants].sort((first, second) => {
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

function buildInitialScoreRecords() {
  return {
    highestWinningScore: null,
    lowestWinningScore: null,
    highestLosingScore: null,
    lowestLosingScore: null,
    winningScoreTotal: 0,
    winningScoreCount: 0,
  };
}

function updateScoreRecords(records, play) {
  if (play.scoringMode === "none" || play.scoringMode === "placement") {
    return;
  }

  const scoredParticipants = (play.participants ?? [])
    .map((participant) => ({
      ...participant,
      score: Number(participant.score),
    }))
    .filter((participant) => Number.isFinite(participant.score));

  if (!scoredParticipants.length) {
    return;
  }

  const worstScore =
    play.scoringMode === "low"
      ? Math.max(...scoredParticipants.map((participant) => participant.score))
      : Math.min(...scoredParticipants.map((participant) => participant.score));

  for (const participant of scoredParticipants) {
    const record = {
      name: participant.name,
      score: participant.score,
      date: play.date,
      playId: play.id,
    };

    if (participant.name === play.winner) {
      records.highestWinningScore = getHigherScoreRecord(records.highestWinningScore, record);
      records.lowestWinningScore = getLowerScoreRecord(records.lowestWinningScore, record);
      records.winningScoreTotal += participant.score;
      records.winningScoreCount += 1;
      continue;
    }

    if (participant.score === worstScore) {
      records.highestLosingScore = getHigherScoreRecord(records.highestLosingScore, record);
      records.lowestLosingScore = getLowerScoreRecord(records.lowestLosingScore, record);
    }
  }
}

function getHigherScoreRecord(currentRecord, nextRecord) {
  return !currentRecord || nextRecord.score > currentRecord.score ? nextRecord : currentRecord;
}

function getLowerScoreRecord(currentRecord, nextRecord) {
  return !currentRecord || nextRecord.score < currentRecord.score ? nextRecord : currentRecord;
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

function formatPlayerWithCount(player, countKey, singularLabel, pluralLabel) {
  if (!player?.name) {
    return "–";
  }

  const count = Number(player[countKey] ?? 0);
  const countLabel = count === 1 ? singularLabel : pluralLabel;

  return (
    <>
      <PlayerLink name={player.name}>{player.name}</PlayerLink>
      <small className="metric-detail">
        {count} {countLabel}
      </small>
    </>
  );
}

function formatAverageWinningScore(scoreRecords) {
  if (!scoreRecords?.winningScoreCount) {
    return "?";
  }

  const averageScore = Math.round((scoreRecords.winningScoreTotal / scoreRecords.winningScoreCount) * 10) / 10;

  return `${averageScore} Punkte`;
}

function formatScoreRecord(record) {
  if (!record?.name) {
    return "?";
  }

  return (
    <>
      <PlayerLink name={record.name}>{record.name}</PlayerLink>
      <small className="metric-detail">
        {record.score} Punkte
      </small>
    </>
  );
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
