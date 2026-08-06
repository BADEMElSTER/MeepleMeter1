import { useMemo, useState } from "react";
import GameLink from "../components/GameLink.jsx";
import PlayerLink from "../components/PlayerLink.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

const tabs = [
  { id: "personal", label: "Persönlich" },
  { id: "games", label: "Spiele" },
  { id: "group", label: "Gruppe" },
];

export default function Stats() {
  const { userProfile } = useAuth();
  const { games, plays, stats } = useAppData();
  const [activeTab, setActiveTab] = useState("personal");
  const analytics = useMemo(() => buildAnalytics(games, plays, stats), [games, plays, stats]);
  const username = userProfile?.username || userProfile?.displayName || "";
  const personalAnalytics = useMemo(
    () => buildPersonalAnalytics(plays, username),
    [plays, username],
  );

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

      {activeTab === "personal" && <PersonalStats analytics={personalAnalytics} username={username} />}
      {activeTab === "games" && <GameStats analytics={analytics} />}
      {activeTab === "group" && <GroupStats analytics={analytics} />}
    </section>
  );
}

function LegacyPersonalStats({ analytics }) {
  const maxPlays = Math.max(...analytics.players.map((player) => player.plays), 1);

  return (
    <>
      <div className="metric-grid">
        <Metric label="Aktive Mitspieler" value={analytics.players.length} />
        <Metric label="Häufigster Spieler" value={<PlayerLink name={analytics.topPlayer?.name}>{analytics.topPlayer?.name ?? "–"}</PlayerLink>} />
        <Metric label="Beste Gewinnquote" value={formatPercent(analytics.bestWinRate?.winRate)} />
        <Metric label="Ø Platzierung" value={formatPlacement(analytics.averagePlacement)} />
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
                playerName={player.name}
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
                  <strong>
                    <PlayerLink name={player.name}>{player.name}</PlayerLink>
                  </strong>
                  <span>
                    {formatPercent(player.winRate)} Gewinnquote · Ø Platz {formatPlacement(player.averagePlacement)}
                  </span>
                  <span>
                    Beste Platzierung:{" "}
                    <GameLink title={player.bestPlacementGame?.title}>
                      {player.bestPlacementGame?.title ?? "–"}
                    </GameLink>
                  </span>
                  <span>
                    Häufigstes Spiel:{" "}
                    <GameLink title={player.mostPlayedGame?.title}>
                      {player.mostPlayedGame?.title ?? "–"}
                    </GameLink>
                  </span>
                </div>
                <span>{player.wins} Siege</span>
              </div>
            ))}
            {!analytics.players.length && <p className="empty-hint">Noch keine Mitspieler erfasst.</p>}
          </div>
        </article>
      </div>
    </>
  );
}

function PersonalStats({ analytics, username }) {
  const [gameSort, setGameSort] = useState({ key: "plays", direction: "desc" });
  const [placementSort, setPlacementSort] = useState({ key: "placement", direction: "asc" });
  const sortedGames = sortRows(analytics.games, gameSort);
  const sortedPlacements = sortRows(analytics.placements, placementSort);
  const maxGamePlays = Math.max(...analytics.games.map((game) => game.plays), 1);

  return (
    <>
      <div className="metric-grid">
        <Metric label="Gespielte Partien" value={analytics.totalPlays} />
        <Metric label="Gewonnen" value={analytics.totalWins} />
        <Metric label="Gewinnquote" value={formatPercent(analytics.winRate)} />
        <Metric label="Teilnahmequote" value={formatPercent(analytics.participationRate)} />
        <Metric label="Ø Platzierung" value={formatPlacement(analytics.averagePlacement)} />
        <Metric
          label="Meistgespielt"
          value={
            analytics.mostPlayedGame ? (
              <GameLink gameId={analytics.mostPlayedGame.gameId}>{analytics.mostPlayedGame.title}</GameLink>
            ) : (
              "–"
            )
          }
        />
      </div>

      <div className="panel-grid">
        <article className="panel">
          <h2>Deine Spiele nach Häufigkeit</h2>
          <div className="chart-list">
            {analytics.games.map((game) => (
              <ChartRow
                gameId={game.gameId}
                key={game.title}
                label={game.title}
                metaItems={[
                  { icon: "🎲", label: `${game.plays} Partien gespielt`, value: game.plays },
                  { icon: "📊", label: `${formatPercent(game.playShare)} deiner Partien`, value: formatPercent(game.playShare) },
                  { icon: "🏆", label: `${formatPercent(game.winRate)} Gewinnquote`, value: formatPercent(game.winRate) },
                ]}
                barLabel={`${game.title}: Orange zeigt ${game.plays} Partien. Grün zeigt ${game.wins} Siege (${formatPercent(game.winRate)} Gewinnquote).`}
                percent={(game.plays / maxGamePlays) * 100}
                winPercent={game.winRate * 100}
              />
            ))}
            {!analytics.games.length && (
              <p className="empty-hint">
                {username ? "Für dich wurden noch keine Partien erfasst." : "Melde dich an, um persönliche Statistiken zu sehen."}
              </p>
            )}
          </div>
        </article>

        <article className="panel">
          <h2>Persönliches Fazit</h2>
          <div className="list">
            <PersonalSummaryRow
              label="Bestes Spiel"
              value={
                analytics.bestGame ? (
                  <>
                    <GameLink gameId={analytics.bestGame.gameId}>{analytics.bestGame.title}</GameLink> · Ø Platz{" "}
                    {formatPlacement(analytics.bestGame.averagePlacement)}
                  </>
                ) : (
                  "Noch keine Platzierungen"
                )
              }
            />
            <PersonalSummaryRow
              label="Schlechtestes Spiel"
              value={
                analytics.worstGame ? (
                  <>
                    <GameLink gameId={analytics.worstGame.gameId}>{analytics.worstGame.title}</GameLink> · Ø Platz{" "}
                    {formatPlacement(analytics.worstGame.averagePlacement)}
                  </>
                ) : (
                  "Noch keine Platzierungen"
                )
              }
            />
            <PersonalSummaryRow
              label="Am häufigsten gewonnen gegen"
              value={
                analytics.mostWonAgainst ? (
                  <>
                    <PlayerLink name={analytics.mostWonAgainst.name}>{analytics.mostWonAgainst.name}</PlayerLink> ·{" "}
                    {analytics.mostWonAgainst.count} Siege
                  </>
                ) : (
                  "Noch keine direkten Siege"
                )
              }
            />
            <PersonalSummaryRow
              label="Am häufigsten verloren gegen"
              value={
                analytics.mostLostAgainst ? (
                  <>
                    <PlayerLink name={analytics.mostLostAgainst.name}>{analytics.mostLostAgainst.name}</PlayerLink> ·{" "}
                    {analytics.mostLostAgainst.count} Niederlagen
                  </>
                ) : (
                  "Noch keine direkten Niederlagen"
                )
              }
            />
          </div>
        </article>
      </div>

      <div className="panel-grid">
        <article className="table-card">
          <h2>Spiele im Detail</h2>
          <table>
            <thead>
              <tr>
                <SortableHeader label="Spiel" sortKey="title" sortState={gameSort} onSort={setGameSort} />
                <SortableHeader label="Partien" sortKey="plays" sortState={gameSort} onSort={setGameSort} />
                <SortableHeader label="Anteil" sortKey="playShare" sortState={gameSort} onSort={setGameSort} />
                <SortableHeader label="Siege" sortKey="wins" sortState={gameSort} onSort={setGameSort} />
                <SortableHeader label="Quote" sortKey="winRate" sortState={gameSort} onSort={setGameSort} />
                <SortableHeader label="Ø Platz" sortKey="averagePlacement" sortState={gameSort} onSort={setGameSort} />
              </tr>
            </thead>
            <tbody>
              {sortedGames.map((game) => (
                <tr key={game.title}>
                  <td>
                    <strong>
                      <GameLink gameId={game.gameId}>{game.title}</GameLink>
                    </strong>
                  </td>
                  <td>{game.plays}</td>
                  <td>{formatPercent(game.playShare)}</td>
                  <td>{game.wins}</td>
                  <td>{formatPercent(game.winRate)}</td>
                  <td>{formatPlacement(game.averagePlacement)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="table-card">
          <h2>Platzierungen</h2>
          <table>
            <thead>
              <tr>
                <SortableHeader label="Platz" sortKey="placement" sortState={placementSort} onSort={setPlacementSort} />
                <SortableHeader label="Anzahl" sortKey="count" sortState={placementSort} onSort={setPlacementSort} />
                <SortableHeader label="Anteil" sortKey="share" sortState={placementSort} onSort={setPlacementSort} />
              </tr>
            </thead>
            <tbody>
              {sortedPlacements.map((placement) => (
                <tr key={placement.placement}>
                  <td>{placement.placement}. Platz</td>
                  <td>{placement.count}</td>
                  <td>{formatPercent(placement.share)}</td>
                </tr>
              ))}
              {!sortedPlacements.length && (
                <tr>
                  <td colSpan="3">Noch keine Platzierungen erfasst.</td>
                </tr>
              )}
            </tbody>
          </table>
        </article>
      </div>
    </>
  );
}

function PersonalSummaryRow({ label, value }) {
  return (
    <div className="list-row">
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
    </div>
  );
}

function SortableHeader({ label, onSort, sortKey, sortState }) {
  const isActive = sortState.key === sortKey;
  const direction = isActive ? sortState.direction : "none";

  return (
    <th>
      <button
        className="sort-button"
        type="button"
        onClick={() =>
          onSort({
            key: sortKey,
            direction: isActive && sortState.direction === "asc" ? "desc" : "asc",
          })
        }
      >
        {label} {direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕"}
      </button>
    </th>
  );
}

function sortRows(rows, sortState) {
  return [...rows].sort((first, second) => {
    const firstValue = first[sortState.key];
    const secondValue = second[sortState.key];

    if (typeof firstValue === "string" || typeof secondValue === "string") {
      return sortState.direction === "asc"
        ? String(firstValue ?? "").localeCompare(String(secondValue ?? ""))
        : String(secondValue ?? "").localeCompare(String(firstValue ?? ""));
    }

    const firstNumber = firstValue ?? Number.POSITIVE_INFINITY;
    const secondNumber = secondValue ?? Number.POSITIVE_INFINITY;

    return sortState.direction === "asc" ? firstNumber - secondNumber : secondNumber - firstNumber;
  });
}

function GameStats({ analytics }) {
  return (
    <>
      <div className="metric-grid">
        <Metric label="Spiele in Sammlung" value={analytics.totalGames} />
        <Metric label="Erfasste Spiel-Partien" value={analytics.totalPlays} />
        <Metric label="Ø Spieldauer" value={formatMinutes(analytics.averageDuration)} />
        <Metric label="Gesamtspielzeit" value={formatHours(analytics.totalDuration)} />
      </div>

      <article className="table-card">
        <h2>Spielestatistiken</h2>
        <table>
          <thead>
            <tr>
              <th>Spiel</th>
              <th>Partien</th>
              <th>Meiste Siege</th>
              <th>Beste Ø Platzierung</th>
              <th>Häufigster Spieler</th>
              <th>Ø Dauer</th>
            </tr>
          </thead>
          <tbody>
            {analytics.gameDetails.map((game) => (
              <tr key={game.id}>
                <td>
                  <strong>
                    <GameLink gameId={game.id}>{game.title}</GameLink>
                  </strong>
                </td>
                <td>{game.plays}</td>
                <td>{formatPlayerStat(game.mostWinsPlayer, "wins", "Siege")}</td>
                <td>{formatPlacementPlayer(game.bestAveragePlacementPlayer)}</td>
                <td>{formatPlayerStat(game.mostFrequentPlayer, "plays", "Partien")}</td>
                <td>{formatMinutes(game.averagePlayedDuration)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </>
  );
}

function GroupStats({ analytics }) {
  const maxPlays = Math.max(...analytics.games.map((game) => game.plays), 1);

  return (
    <>
      <div className="metric-grid">
        <Metric label="Erfasste Partien" value={analytics.totalPlays} />
        <Metric label="Gespielte Spiele" value={analytics.playedGames} />
        <Metric label="Ungespielte Spiele" value={analytics.unplayedGames} />
        <Metric
          label="Meistgespielt"
          value={
            <GameLink gameId={analytics.mostPlayedGame?.id}>
              {analytics.mostPlayedGame?.title ?? "–"}
            </GameLink>
          }
        />
      </div>

      <div className="panel-grid">
        <article className="panel">
          <h2>Meistgespielte Spiele</h2>
          <div className="chart-list">
            {analytics.games.map((game) => (
              <ChartRow
                gameId={game.id}
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
                  <strong>
                    <GameLink gameId={game.id}>{game.title}</GameLink>
                  </strong>
                  <span>
                    {game.minPlayers}–{game.maxPlayers} Spieler · {game.duration} Min.
                  </span>
                </div>
              </div>
            ))}
            {!analytics.unplayedGameList.length && <p className="empty-hint">Alle Spiele wurden bereits gespielt.</p>}
          </div>
        </article>

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
                  <strong>
                    <PlayerLink name={play.winner}>{play.winner}</PlayerLink>
                  </strong>
                  <span>
                    <GameLink gameId={play.gameId} title={play.game} /> ·{" "}
                    {new Date(play.date).toLocaleDateString("de-DE")}
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

function ChartRow({ barLabel, gameId, playerName, label, meta, metaItems = [], percent, winPercent = null }) {
  const resolvedBarLabel =
    barLabel ??
    (winPercent === null
      ? undefined
      : `Balken zeigt Partien, grüner Anteil zeigt ${Math.round(winPercent)} % Siege bei diesem Spiel.`);

  return (
    <div className="chart-row">
      <div>
        <strong>
          {gameId ? <GameLink gameId={gameId}>{label}</GameLink> : null}
          {playerName ? <PlayerLink name={playerName}>{label}</PlayerLink> : null}
          {!gameId && !playerName ? label : null}
        </strong>
        {metaItems.length > 0 ? (
          <span className="icon-meta-list">
            {metaItems.map((item) => (
              <span
                aria-label={item.label}
                className="icon-meta"
                key={item.label}
                role="img"
                title={item.label}
              >
                <span aria-hidden="true" className="icon-meta-symbol">
                  {item.icon}
                </span>
                <span className="icon-meta-value">{item.value}</span>
              </span>
            ))}
          </span>
        ) : (
          <span>{meta}</span>
        )}
      </div>
      <div
        aria-label={resolvedBarLabel}
        className={winPercent === null ? "bar" : "bar stacked-bar"}
        role={resolvedBarLabel ? "img" : undefined}
        title={resolvedBarLabel}
      >
        <span className="bar-fill" style={{ width: `${Math.max(percent, 4)}%` }}>
          {winPercent !== null && (
            <span
              className="bar-win-fill"
              style={{ width: `${Math.max(Math.min(winPercent, 100), 0)}%` }}
            />
          )}
        </span>
      </div>
    </div>
  );
}

function buildPersonalAnalytics(plays, username) {
  const normalizedUsername = normalizeName(username);
  const gameMap = new Map();
  const placementMap = new Map();
  const wonAgainstMap = new Map();
  const lostAgainstMap = new Map();
  let totalWins = 0;
  let totalPlacement = 0;
  let placementCount = 0;

  if (!normalizedUsername) {
    return createEmptyPersonalAnalytics();
  }

  const personalPlays = plays.filter((play) =>
    (play.participants ?? []).some((participant) => normalizeName(participant.name) === normalizedUsername),
  );

  for (const play of personalPlays) {
    const placements = getPlayPlacements(play);
    const ownParticipant = (play.participants ?? []).find(
      (participant) => normalizeName(participant.name) === normalizedUsername,
    );
    const ownPlacement = ownParticipant ? placements.get(ownParticipant.name) ?? null : null;
    const gameTitle = play.game ?? "Unbekanntes Spiel";
    const game = gameMap.get(gameTitle) ?? createPersonalGameStats(play.gameId, gameTitle);

    game.plays += 1;

    if (normalizeName(play.winner) === normalizedUsername) {
      totalWins += 1;
      game.wins += 1;

      for (const participant of play.participants ?? []) {
        if (normalizeName(participant.name) !== normalizedUsername) {
          incrementNameCount(wonAgainstMap, participant.name);
        }
      }
    } else if (play.winner && play.winner !== "Nicht erfasst") {
      incrementNameCount(lostAgainstMap, play.winner);
    }

    if (ownPlacement !== null) {
      totalPlacement += ownPlacement;
      placementCount += 1;
      game.totalPlacement += ownPlacement;
      game.placementCount += 1;
      placementMap.set(ownPlacement, (placementMap.get(ownPlacement) ?? 0) + 1);
    }

    gameMap.set(gameTitle, game);
  }

  const games = [...gameMap.values()]
    .map((game) => ({
      ...game,
      playShare: personalPlays.length ? game.plays / personalPlays.length : 0,
      winRate: game.plays ? game.wins / game.plays : 0,
      averagePlacement: game.placementCount ? game.totalPlacement / game.placementCount : null,
    }))
    .sort((first, second) => second.plays - first.plays || first.title.localeCompare(second.title));
  const gamesWithPlacements = games.filter((game) => game.averagePlacement !== null);

  return {
    totalPlays: personalPlays.length,
    totalWins,
    winRate: personalPlays.length ? totalWins / personalPlays.length : 0,
    participationRate: plays.length ? personalPlays.length / plays.length : 0,
    averagePlacement: placementCount ? totalPlacement / placementCount : null,
    games,
    placements: [...placementMap.entries()]
      .map(([placement, count]) => ({ placement, count, share: placementCount ? count / placementCount : 0 }))
      .sort((first, second) => first.placement - second.placement),
    mostPlayedGame: games[0] ?? null,
    bestGame:
      [...gamesWithPlacements].sort(
        (first, second) => first.averagePlacement - second.averagePlacement || second.wins - first.wins,
      )[0] ?? null,
    worstGame:
      [...gamesWithPlacements].sort(
        (first, second) => second.averagePlacement - first.averagePlacement || first.wins - second.wins,
      )[0] ?? null,
    mostWonAgainst: getTopNameCount(wonAgainstMap),
    mostLostAgainst: getTopNameCount(lostAgainstMap),
  };
}

function createEmptyPersonalAnalytics() {
  return {
    totalPlays: 0,
    totalWins: 0,
    winRate: 0,
    participationRate: 0,
    averagePlacement: null,
    games: [],
    placements: [],
    mostPlayedGame: null,
    bestGame: null,
    worstGame: null,
    mostWonAgainst: null,
    mostLostAgainst: null,
  };
}

function createPersonalGameStats(gameId, title) {
  return {
    gameId,
    title,
    plays: 0,
    wins: 0,
    totalPlacement: 0,
    placementCount: 0,
  };
}

function incrementNameCount(map, name) {
  if (!name) return;
  map.set(name, (map.get(name) ?? 0) + 1);
}

function getTopNameCount(map) {
  return (
    [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name))[0] ?? null
  );
}

function normalizeName(name = "") {
  return name.trim().toLowerCase();
}

function buildAnalytics(games, plays, stats) {
  const playerMap = new Map();
  const gamePlayerMap = new Map();
  let totalPlacement = 0;
  let placementResults = 0;

  for (const play of plays) {
    const placements = getPlayPlacements(play);

    for (const participant of play.participants ?? []) {
      const placement = placements.get(participant.name) ?? null;
      const gameTitle = play.game ?? "Unbekanntes Spiel";
      const player = playerMap.get(participant.name) ?? createPlayerStats(participant.name);
      const playerGame = player.games.get(gameTitle) ?? createPlayerGameStats(gameTitle);

      player.plays += 1;
      playerGame.plays += 1;

      if (play.winner === participant.name) {
        player.wins += 1;
        playerGame.wins += 1;
      }

      if (placement !== null) {
        player.totalPlacement += placement;
        player.placementCount += 1;
        playerGame.totalPlacement += placement;
        playerGame.placementCount += 1;
        totalPlacement += placement;
        placementResults += 1;
      }

      player.games.set(gameTitle, playerGame);
      playerMap.set(participant.name, player);

      const gameKey = play.gameId ?? gameTitle;
      const gamePlayers = gamePlayerMap.get(gameKey) ?? new Map();
      const gamePlayer = gamePlayers.get(participant.name) ?? createGamePlayerStats(participant.name);

      gamePlayer.plays += 1;
      if (play.winner === participant.name) gamePlayer.wins += 1;
      if (placement !== null) {
        gamePlayer.totalPlacement += placement;
        gamePlayer.placementCount += 1;
      }

      gamePlayers.set(participant.name, gamePlayer);
      gamePlayerMap.set(gameKey, gamePlayers);
    }
  }

  const players = [...playerMap.values()]
    .map(enrichPlayerStats)
    .sort((first, second) => second.plays - first.plays || second.wins - first.wins);

  const gamesWithCounts = [...stats.gamesWithPlayCounts].sort(
    (first, second) => second.plays - first.plays || first.title.localeCompare(second.title),
  );
  const gameDetails = gamesWithCounts.map((game) => {
    const gamePlayers = [...(gamePlayerMap.get(game.id) ?? gamePlayerMap.get(game.title) ?? new Map()).values()].map(
      enrichGamePlayerStats,
    );

    return {
      ...game,
      mostWinsPlayer:
        [...gamePlayers].sort((first, second) => second.wins - first.wins || second.plays - first.plays)[0] ?? null,
      bestAveragePlacementPlayer:
        [...gamePlayers
          .filter((player) => player.placementCount > 0)
        ].sort(
            (first, second) =>
              first.averagePlacement - second.averagePlacement || second.plays - first.plays,
          )[0] ?? null,
      mostFrequentPlayer:
        [...gamePlayers].sort((first, second) => second.plays - first.plays || second.wins - first.wins)[0] ??
        null,
    };
  });
  const totalDuration = plays.reduce((sum, play) => sum + Number(play.duration || 0), 0);
  const totalPlayerCount = plays.reduce((sum, play) => sum + Number(play.players || 0), 0);

  return {
    totalGames: games.length,
    totalPlays: plays.length,
    totalDuration,
    averageDuration: stats.averageDuration,
    averagePlayerCount: plays.length ? totalPlayerCount / plays.length : 0,
    averagePlacement: placementResults ? totalPlacement / placementResults : null,
    durationByPlayerCount: stats.durationByPlayerCount,
    games: gamesWithCounts,
    gameDetails,
    playedGames: gamesWithCounts.filter((game) => game.plays > 0).length,
    unplayedGames: gamesWithCounts.filter((game) => game.plays === 0).length,
    unplayedGameList: gamesWithCounts.filter((game) => game.plays === 0),
    players,
    topPlayer: players[0] ?? null,
    bestWinRate:
      [...players
        .filter((player) => player.plays >= 2)
      ].sort((first, second) => second.winRate - first.winRate || second.wins - first.wins)[0] ??
      null,
    mostPlayedGame: stats.mostPlayedGame,
    latestWinners: plays.filter((play) => play.winner && play.winner !== "Nicht erfasst").slice(0, 8),
  };
}

function createPlayerStats(name) {
  return {
    name,
    plays: 0,
    wins: 0,
    totalPlacement: 0,
    placementCount: 0,
    games: new Map(),
  };
}

function createPlayerGameStats(title) {
  return {
    title,
    plays: 0,
    wins: 0,
    totalPlacement: 0,
    placementCount: 0,
  };
}

function createGamePlayerStats(name) {
  return {
    name,
    plays: 0,
    wins: 0,
    totalPlacement: 0,
    placementCount: 0,
  };
}

function enrichPlayerStats(player) {
  const games = [...player.games.values()].map((game) => ({
    ...game,
    averagePlacement: game.placementCount ? game.totalPlacement / game.placementCount : null,
  }));

  return {
    ...player,
    winRate: player.plays ? player.wins / player.plays : 0,
    averagePlacement: player.placementCount ? player.totalPlacement / player.placementCount : null,
    bestPlacementGame:
      [...games
        .filter((game) => game.averagePlacement !== null)
      ].sort((first, second) => first.averagePlacement - second.averagePlacement || second.plays - first.plays)[0] ??
      null,
    mostPlayedGame:
      [...games].sort((first, second) => second.plays - first.plays || second.wins - first.wins)[0] ?? null,
  };
}

function enrichGamePlayerStats(player) {
  return {
    ...player,
    averagePlacement: player.placementCount ? player.totalPlacement / player.placementCount : null,
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

function formatPlacement(value) {
  return value === null || value === undefined ? "–" : Math.round(value * 10) / 10;
}

function formatPlayerStat(player, key, label) {
  return player ? (
    <>
      <PlayerLink name={player.name}>{player.name}</PlayerLink> ({player[key]} {label})
    </>
  ) : (
    "–"
  );
}

function formatPlacementPlayer(player) {
  return player ? (
    <>
      <PlayerLink name={player.name}>{player.name}</PlayerLink> (Ø Platz {formatPlacement(player.averagePlacement)})
    </>
  ) : (
    "–"
  );
}

