import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { games as initialGames, plays as initialPlays } from "./mockData.js";

const AppDataContext = createContext(null);
const STORAGE_KEY = "meeplemeter-data-v1";

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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
      scoreDetails: participant.scoreDetails ?? {},
    }));
}

function calculateWinner(participants, scoringMode, fallbackWinner = "") {
  if (scoringMode === "none") {
    return fallbackWinner.trim() || "Nicht erfasst";
  }

  if (!participants.length) {
    return "Nicht erfasst";
  }

  const sortedParticipants = [...participants].sort((first, second) =>
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
    scoreCategories: normalizeScoreCategories(game.scoreCategories),
    owner: game.owner?.trim() ?? "",
    ownerNormalized: game.ownerNormalized ?? game.owner?.trim().toLowerCase() ?? "",
  };
}

function buildGame(gameInput, existingGame = {}) {
  const minPlayers = Number(gameInput.minPlayers) || 1;
  const catalogYear = Object.hasOwn(gameInput, "catalogYear")
    ? Number(gameInput.catalogYear) || null
    : existingGame.catalogYear ?? null;

  return normalizeGame({
    ...existingGame,
    title: gameInput.title.trim(),
    category: gameInput.category.trim() || "Nicht kategorisiert",
    minPlayers,
    maxPlayers: Math.max(Number(gameInput.maxPlayers) || minPlayers, minPlayers),
    duration: Number(gameInput.duration) || 0,
    bggId: gameInput.bggId ?? existingGame.bggId ?? null,
    catalogId: gameInput.catalogId ?? existingGame.catalogId ?? null,
    catalogYear,
    catalogRank: gameInput.catalogRank ?? existingGame.catalogRank ?? null,
    catalogRating: gameInput.catalogRating ?? existingGame.catalogRating ?? null,
    catalogImage: gameInput.catalogImage ?? existingGame.catalogImage ?? null,
    catalogExpansions: gameInput.catalogExpansions ?? existingGame.catalogExpansions ?? [],
    expansions: parseExpansions(gameInput.expansions ?? existingGame.expansions ?? []),
    scoreCategories: normalizeScoreCategories(gameInput.scoreCategories ?? existingGame.scoreCategories),
    owner: gameInput.owner?.trim() || existingGame.owner || "",
    ownerNormalized:
      gameInput.owner?.trim().toLowerCase() ||
      existingGame.ownerNormalized ||
      existingGame.owner?.trim().toLowerCase() ||
      "",
  });
}

function normalizeScoreCategories(categories = []) {
  if (!Array.isArray(categories)) {
    return [];
  }

  return categories
    .map((category) => ({
      id: category.id || createId(),
      name: category.name?.trim() ?? "",
      type: category.type === "minus" ? "minus" : "plus",
      multiplier: Number(category.multiplier) || 1,
    }))
    .filter((category) => category.name);
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
    accountEmail: profile.accountEmail?.trim() ?? "",
    accountUsername: profile.accountUsername?.trim() ?? "",
    accountStatus: profile.accountStatus ?? "guest",
    isDeleted: Boolean(profile.isDeleted),
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
      .sort((a, b) => a.playerCount - b.playerCount);
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
        [...gamesWithPlayCounts].sort((a, b) => Number(b.plays) - Number(a.plays))[0] ??
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
      return [{ id: createId(), ...buildGame(gameInput) }, ...currentGames];
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

  function updateGameScoreCategories(gameId, scoreCategories) {
    setGames((currentGames) =>
      currentGames.map((game) =>
        game.id === gameId
          ? { ...game, scoreCategories: normalizeScoreCategories(scoreCategories) }
          : game,
      ),
    );
  }

  function addPlay(playInput) {
    const play = {
      id: createId(),
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

  function deletePlayer(playerName) {
    const normalizedPlayerName = playerName.trim().toLowerCase();

    if (!normalizedPlayerName) {
      return;
    }

    setPlayerProfiles((currentProfiles) => {
      const existingProfile = currentProfiles.find(
        (profile) => profile.name.toLowerCase() === normalizedPlayerName,
      );

      if (existingProfile) {
        return currentProfiles.map((profile) =>
          profile.name.toLowerCase() === normalizedPlayerName
            ? { ...profile, isDeleted: true, accountStatus: "deleted" }
            : profile,
        );
      }

      return [
        {
          name: playerName.trim(),
          favoriteGame: "",
          favoriteColor: "",
          accountEmail: "",
          accountUsername: "",
          accountStatus: "deleted",
          isDeleted: true,
          notes: "",
        },
        ...currentProfiles,
      ];
    });
  }

  function renamePlayer(oldName, newName) {
    const normalizedOldName = oldName.trim().toLowerCase();
    const trimmedNewName = newName.trim();

    if (!normalizedOldName || !trimmedNewName || normalizedOldName === trimmedNewName.toLowerCase()) {
      return;
    }

    setPlays((currentPlays) =>
      currentPlays.map((play) => ({
        ...play,
        winner: play.winner?.trim().toLowerCase() === normalizedOldName ? trimmedNewName : play.winner,
        participants: (play.participants ?? []).map((participant) =>
          participant.name?.trim().toLowerCase() === normalizedOldName
            ? { ...participant, name: trimmedNewName }
            : participant,
        ),
      })),
    );

    setPlayerProfiles((currentProfiles) =>
      currentProfiles.map((profile) =>
        profile.name?.trim().toLowerCase() === normalizedOldName
          ? { ...profile, name: trimmedNewName, accountUsername: trimmedNewName }
          : profile,
      ),
    );
  }

  function resetLocalData(options) {
    if (options.resetGames) {
      setGames([]);
    }

    if (options.resetPlays) {
      setPlays([]);
    }

    if (options.resetPlayers) {
      setPlayerProfiles([]);
    }
  }

  const value = useMemo(
    () => ({
      games,
      plays,
      playerProfiles,
      stats,
      addGame,
      updateGame,
      updateGameScoreCategories,
      deleteGame,
      addPlay,
      updatePlay,
      deletePlay,
      updatePlayerProfile,
      deletePlayer,
      renamePlayer,
      resetLocalData,
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

