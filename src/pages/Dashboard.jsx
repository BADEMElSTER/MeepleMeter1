import { Link } from "react-router-dom";
import GameLink from "../components/GameLink.jsx";
import PlayerLink from "../components/PlayerLink.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

export default function Dashboard() {
  const { user, userProfile } = useAuth();
  const { games, plays, playerProfiles, stats } = useAppData();
  const username = getCurrentPlayerName(user, userProfile, playerProfiles);
  const normalizedUsername = normalizeName(username);
  const personalPlays = normalizedUsername
    ? plays.filter((play) =>
        play.participants?.some(
          (participant) => normalizeName(participant.name) === normalizedUsername,
        ),
      )
    : [];
  const ownGames = normalizedUsername
    ? games.filter(
        (game) =>
          normalizeName(game.ownerNormalized || game.owner) === normalizedUsername,
      )
    : [];
  const groupTotalDuration = plays.reduce((sum, play) => sum + Number(play.duration || 0), 0);
  const personalTotalDuration = personalPlays.reduce(
    (sum, play) => sum + Number(play.duration || 0),
    0,
  );
  const latestPersonalPlays = personalPlays.slice(0, 5);
  const personalMostPlayedGame = getMostPlayedGame(personalPlays, games);
  const groupMostPlayedGame = getMostPlayedGame(plays, games);
  const placementAnalytics = getPlacementAnalytics(personalPlays, games, normalizedUsername);

  return (
    <section className="page">
      <div className="page-heading">
        <h1>{username ? `Willkommen, ${username}.` : "Deine Brettspielrunde auf einen Blick."}</h1>
        {username && <p className="page-intro">Deine Brettspielrunde auf einen Blick.</p>}
      </div>

      <div className="metric-grid dashboard-metric-grid">
        <Metric
          label="Eigene Spiele"
          value={ownGames.length}
          detail={`Gruppe: ${stats.totalGames} Spiele`}
        />
        <Metric
          label="Eigene Partien"
          value={personalPlays.length}
          detail={`Gruppe: ${stats.totalPlays} Partien`}
        />
        <Metric
          label="Eigene Dauer"
          value={`${personalTotalDuration} Min.`}
          detail={`Gruppe: ${groupTotalDuration} Min.`}
        />
        <Metric
          label="Mein meistgespieltes Spiel"
          value={
            personalMostPlayedGame ? (
              <GameLink gameId={personalMostPlayedGame.id}>
                {personalMostPlayedGame.title}
              </GameLink>
            ) : (
              "Noch keine Partie"
            )
          }
          detail={
            groupMostPlayedGame
              ? `Gruppe: ${groupMostPlayedGame.title} (${groupMostPlayedGame.plays})`
              : "Gruppe: noch keine Partien"
          }
        />
        <Metric
          label="Ø Platzierung"
          value={
            placementAnalytics.averagePlacement === null
              ? "–"
              : `Platz ${formatPlacement(placementAnalytics.averagePlacement)}`
          }
          detail={
            placementAnalytics.placementCount
              ? `${placementAnalytics.placementCount} gewertete Partien`
              : "Noch keine Platzierungen"
          }
        />
        <Metric
          label="Bestes Spiel nach Platzierung"
          value={
            placementAnalytics.bestGame ? (
              <GameLink
                gameId={placementAnalytics.bestGame.id}
                title={placementAnalytics.bestGame.title}
              >
                {placementAnalytics.bestGame.title}
              </GameLink>
            ) : (
              "–"
            )
          }
          detail={
            placementAnalytics.bestGame
              ? `Ø Platz ${formatPlacement(placementAnalytics.bestGame.averagePlacement)} · ${placementAnalytics.bestGame.placementCount} gewertet`
              : "Noch keine Platzierungen"
          }
        />
      </div>

      <div className="panel-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>{username ? "Meine letzten Partien" : "Letzte Partien"}</h2>
          </div>
          <div className="list">
            {latestPersonalPlays.length ? (
              latestPersonalPlays.map((play) => {
                const ownPlacement = getOwnPlacement(play, normalizedUsername);

                return (
                  <div className="list-row dashboard-play-row" key={play.id}>
                    <div>
                      <strong>
                        <GameLink gameId={play.gameId} title={play.game} />
                      </strong>
                      <span>{new Date(play.date).toLocaleDateString("de-DE")}</span>
                    </div>
                    <div className="dashboard-play-meta">
                      <span
                        className="play-badge winner-badge"
                        title={`Gewinner: ${play.winner}`}
                        aria-label={`Gewinner: ${play.winner}`}
                      >
                        <span aria-hidden="true">🏆</span>
                        <PlayerLink name={play.winner}>{play.winner}</PlayerLink>
                      </span>
                      {ownPlacement && (
                        <span
                          className="play-badge placement-badge"
                          title={`Eigene Platzierung: Platz ${ownPlacement}`}
                          aria-label={`Eigene Platzierung: Platz ${ownPlacement}`}
                        >
                          <span aria-hidden="true">📍</span>
                          Platz {ownPlacement}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="page-intro">
                Für {username} wurden noch keine eigenen Partien erfasst.
              </p>
            )}
          </div>
          <Link className="panel-footer-link" to="/plays">
            Alle Partien anzeigen
          </Link>
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

function getCurrentPlayerName(user, userProfile, playerProfiles) {
  const profileName = userProfile?.username || userProfile?.displayName;

  if (profileName?.trim()) {
    return profileName.trim();
  }

  const userEmail = user?.email?.trim().toLowerCase();

  if (!userEmail) {
    return "";
  }

  const matchingPlayerProfile = playerProfiles.find((profile) => {
    const profileEmail = profile.accountEmail?.trim().toLowerCase();
    const profileUsername = profile.accountUsername?.trim().toLowerCase();

    return profileEmail === userEmail || profileUsername === userEmail;
  });

  return matchingPlayerProfile?.name ?? "";
}

function normalizeName(name) {
  return String(name ?? "").trim().toLowerCase();
}

function Metric({ detail, label, value }) {
  return (
    <article className="metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      {detail && <small className="metric-detail">{detail}</small>}
    </article>
  );
}

function getMostPlayedGame(personalPlays, games) {
  if (!personalPlays.length) {
    return null;
  }

  const playCounts = personalPlays.reduce((counts, play) => {
    const key = play.gameId || play.game;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map());
  const [gameKey, plays] =
    [...playCounts.entries()].sort((first, second) => second[1] - first[1])[0] ?? [];

  if (!gameKey) {
    return null;
  }

  const game = games.find((entry) => entry.id === gameKey || entry.title === gameKey);
  return {
    id: game?.id ?? gameKey,
    title: game?.title ?? gameKey,
    plays,
  };
}

function getOwnPlacement(play, normalizedUsername) {
  if (!normalizedUsername) {
    return null;
  }

  const participant = (play.participants ?? []).find(
    (entry) => normalizeName(entry.name) === normalizedUsername,
  );
  const placement = getPlayPlacements(play).get(participant?.name);

  return placement ?? null;
}

function getPlacementAnalytics(personalPlays, games, normalizedUsername) {
  const gamePlacements = new Map();
  let totalPlacement = 0;
  let placementCount = 0;

  for (const play of personalPlays) {
    const participant = (play.participants ?? []).find(
      (entry) => normalizeName(entry.name) === normalizedUsername,
    );
    const placement = getPlayPlacements(play).get(participant?.name);

    if (placement === undefined) {
      continue;
    }

    totalPlacement += placement;
    placementCount += 1;

    const gameKey = play.gameId || play.game;
    const current = gamePlacements.get(gameKey) ?? {
      id: play.gameId,
      title: play.game || "Unbekanntes Spiel",
      totalPlacement: 0,
      placementCount: 0,
    };
    current.totalPlacement += placement;
    current.placementCount += 1;
    gamePlacements.set(gameKey, current);
  }

  const bestGame = [...gamePlacements.values()]
    .map((entry) => {
      const game = games.find(
        (candidate) => candidate.id === entry.id || candidate.title === entry.title,
      );

      return {
        ...entry,
        id: game?.id ?? entry.id,
        title: game?.title ?? entry.title,
        averagePlacement: entry.totalPlacement / entry.placementCount,
      };
    })
    .sort(
      (first, second) =>
        first.averagePlacement - second.averagePlacement ||
        second.placementCount - first.placementCount ||
        first.title.localeCompare(second.title, "de"),
    )[0] ?? null;

  return {
    averagePlacement: placementCount ? totalPlacement / placementCount : null,
    placementCount,
    bestGame,
  };
}

function getPlayPlacements(play) {
  const participants = (play.participants ?? []).filter(
    (participant) =>
      participant.score !== null && participant.score !== undefined && participant.score !== "",
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

function formatPlacement(value) {
  return Number(value).toLocaleString("de-DE", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  });
}
