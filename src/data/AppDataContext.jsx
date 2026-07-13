import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { games as initialGames, plays as initialPlays } from "./mockData.js";

const AppDataContext = createContext(null);
const STORAGE_KEY = "meeplemeter-data-v1";

function loadStoredData() {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    return storedData ? JSON.parse(storedData) : null;
  } catch {
    return null;
  }
}

function normalizeParticipants(participants = [], scoringMode = "none") {
  return participants
    .filter((participant) => participant.name.trim())
    .map((participant) => ({
      name: participant.name.trim(),
      score: scoringMode === "none" ? null : Number(participant.score) || 0,
    }));
}

function calculateWinner(participants, scoringMode, fallbackWinner = "") {
  if (scoringMode === "none") {
    return fallbackWinner.trim() || "Nicht erfasst";
  }

  if (!participants.length) {
    return "Nicht erfasst";
  }

  const sortedParticipants = participants.toSorted((first, second) =>
    scoringMode === "low" ? first.score - second.score : second.score - first.score,
  );

  return sortedParticipants[0]?.name ?? "Nicht erfasst";
}

function normalizeGame(game) {
  const minPlayers = Number(game.minPlayers) || 1;
  const maxPlayers = Math.max(Number(game.maxPlayers) || minPlayers, minPlayers);

  return {
    ...game,
    minPlayers,
    maxPlayers,
    players: minPlayers === maxPlayers ? `${minPlayers}` : `${minPlayers}–${maxPlayers}`,
    duration: Number(game.duration) || 0,
    bggId: game.bggId ?? null,
    catalogId: game.catalogId ?? null,
    catalogYear: game.catalogYear ?? null,
    catalogRank: game.catalogRank ?? null,
    catalogRating: game.catalogRating ?? null,
    catalogImage: game.catalogImage ?? null,
    catalogExpansions: game.catalogExpansions ?? [],
    expansions: game.expansions ?? game.catalogExpansions ?? [],
  };
}

function buildGame(gameInput, existingGame = {}) {
  const minPlayers = Number(gameInput.minPlayers) || 1;

  return normalizeGame({
    ...existingGame,
    title: gameInput.title.trim(),
    category: gameInput.category.trim() || "Nicht kategorisiert",
    minPlayers,
    maxPlayers: Math.max(Number(gameInput.maxPlayers) || minPlayers, minPlayers),
    duration: Number(gameInput.duration) || 0,
    bggId: gameInput.bggId ?? existingGame.bggId ?? null,
    catalogId: gameInput.catalogId ?? existingGame.catalogId ?? null,
    catalogYear: gameInput.catalogYear ?? existingGame.catalogYear ?? null,
    catalogRank: gameInput.catalogRank ?? existingGame.catalogRank ?? null,
    catalogRating: gameInput.catalogRating ?? existingGame.catalogRating ?? null,
    catalogImage: gameInput.catalogImage ?? existingGame.catalogImage ?? null,
    catalogExpansions: gameInput.catalogExpansions ?? existingGame.catalogExpansions ?? [],
    expansions: parseExpansions(gameInput.expansions ?? existingGame.expansions ?? []),
  });
}

function normalizeTitle(title) {
  return title.trim().toLowerCase();
}

function parseExpansions(expansions) {
  if (Array.isArray(expansions)) {
    return expansions
      .map((expansion) =>
        typeof expansion === "string" ? { name: expansion.trim() } : { name: expansion.name?.trim() },
      )
      .filter((expansion) => expansion.name);
  }

  return String(expansions)
    .split(/\n|,/)
    .map((name) => ({ name: name.trim() }))
    .filter((expansion) => expansion.name);
}

function buildPlay(playInput, games, existingPlay = {}) {
  const selectedGame = games.find((game) => game.id === playInput.gameId);
  const scoringMode = playInput.scoringMode ?? "none";
  const participants = normalizeParticipants(playInput.participants, scoringMode);

  return {
    ...existingPlay,
    gameId: playInput.gameId,
    game: selectedGame?.title ?? existingPlay.game ?? "Unbekanntes Spiel",
    date: playInput.date,
    players: participants.length || 1,
    scoringMode,
    participants,
    winner: calculateWinner(participants, scoringMode, playInput.winner),
    duration: Number(playInput.duration) || selectedGame?.duration || 0,
    note: playInput.note.trim() || "Keine Notiz erfasst.",
  };
}

function normalizePlayerProfile(profile) {
  return {
    name: profile.name?.trim() ?? "",
    favoriteGame: profile.favoriteGame?.trim() ?? "",
    favoriteColor: profile.favoriteColor?.trim() ?? "",
    notes: profile.notes?.trim() ?? "",
  };
}

export function AppDataProvider({ children }) {
  const storedData = loadStoredData();
  const [games, setGames] = useState(() =>
    (storedData?.games ?? initialGames).map(normalizeGame),
  );
  const [plays, setPlays] = useState(() => storedData?.plays ?? initialPlays);
  const [playerProfiles, setPlayerProfiles] = useState(() =>
    (storedData?.playerProfiles ?? []).map(normalizePlayerProfile),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ games, plays, playerProfiles }));
  }, [games, plays, playerProfiles]);

  const stats = useMemo(() => {
    const totalDuration = plays.reduce((sum, play) => sum + Number(play.duration), 0);
    const durationByPlayerCount = plays
      .reduce((groups, play) => {
        const playerCount = Number(play.players) || 1;
        const existingGroup = groups.find((group) => group.playerCount === playerCount);

        if (existingGroup) {
          existingGroup.totalDuration += Number(play.duration);
          existingGroup.playCount += 1;
        } else {
          groups.push({
            playerCount,
            totalDuration: Number(play.duration),
            playCount: 1,
          });
        }

        return groups;
      }, [])
      .map((group) => ({
        playerCount: group.playerCount,
        playCount: group.playCount,
        averageDuration: Math.round(group.totalDuration / group.playCount),
      }))
      .toSorted((a, b) => a.playerCount - b.playerCount);
    const gamesWithPlayCounts = games.map((game) => {
      const matchingPlays = plays.filter(
        (play) => play.gameId === game.id || play.game === game.title,
      );
      const totalGameDuration = matchingPlays.reduce(
        (sum, play) => sum + Number(play.duration),
        0,
      );

      return {
        ...game,
        plays: matchingPlays.length,
        expansionCount: game.expansions?.length ?? 0,
        averagePlayedDuration: matchingPlays.length
          ? Math.round(totalGameDuration / matchingPlays.length)
          : null,
      };
    });
    const fallbackGame = gamesWithPlayCounts[0] ?? {
      title: "Noch kein Spiel",
      plays: 0,
    };

    return {
      totalGames: games.length,
      totalPlays: plays.length,
      averageDuration: plays.length ? Math.round(totalDuration / plays.length) : 0,
      durationByPlayerCount,
      mostPlayedGame:
        gamesWithPlayCounts.toSorted((a, b) => Number(b.plays) - Number(a.plays))[0] ??
        fallbackGame,
      gamesWithPlayCounts,
    };
  }, [games, plays]);

  function addGame(gameInput) {
    let wasAdded = false;

    setGames((currentGames) => {
      const alreadyExists = currentGames.some(
        (game) =>
          (gameInput.bggId && game.bggId === gameInput.bggId) ||
          normalizeTitle(game.title) === normalizeTitle(gameInput.title),
      );

      if (alreadyExists) {
        return currentGames;
      }

      wasAdded = true;
      return [{ id: crypto.randomUUID(), ...buildGame(gameInput) }, ...currentGames];
    });

    return wasAdded;
  }

  function updateGame(gameId, gameInput) {
    setGames((currentGames) =>
      currentGames.map((game) => (game.id === gameId ? buildGame(gameInput, game) : game)),
    );

    setPlays((currentPlays) =>
      currentPlays.map((play) =>
        play.gameId === gameId ? { ...play, game: gameInput.title.trim() || play.game } : play,
      ),
    );
  }

  function deleteGame(gameId) {
    setGames((currentGames) => currentGames.filter((game) => game.id !== gameId));
    setPlays((currentPlays) => currentPlays.filter((play) => play.gameId !== gameId));
  }

  function addPlay(playInput) {
    const play = {
      id: crypto.randomUUID(),
      ...buildPlay(playInput, games),
    };

    setPlays((currentPlays) => [play, ...currentPlays]);
  }

  function updatePlay(playId, playInput) {
    setPlays((currentPlays) =>
      currentPlays.map((play) =>
        play.id === playId ? buildPlay(playInput, games, play) : play,
      ),
    );
  }

  function deletePlay(playId) {
    setPlays((currentPlays) => currentPlays.filter((play) => play.id !== playId));
  }

  function updatePlayerProfile(playerName, profileInput) {
    const normalizedProfile = normalizePlayerProfile({
      ...profileInput,
      name: playerName,
    });

    setPlayerProfiles((currentProfiles) => {
      const existingProfile = currentProfiles.find(
        (profile) => profile.name.toLowerCase() === playerName.trim().toLowerCase(),
      );

      if (existingProfile) {
        return currentProfiles.map((profile) =>
          profile.name.toLowerCase() === playerName.trim().toLowerCase()
            ? normalizedProfile
            : profile,
        );
      }

      return [normalizedProfile, ...currentProfiles];
    });
  }

  const value = useMemo(
    () => ({
      games,
      plays,
      playerProfiles,
      stats,
      addGame,
      updateGame,
      deleteGame,
      addPlay,
      updatePlay,
      deletePlay,
      updatePlayerProfile,
    }),
    [games, plays, playerProfiles, stats],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider");
  }

  return context;
}
