import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "../auth/AuthContext.jsx";
import {
  dataBackend,
  firebaseGroupId,
  firestoreDb,
  isFirebaseConfigured,
} from "../firebase/client.js";
import { games as initialGames, plays as initialPlays } from "./mockData.js";

const AppDataContext = createContext(null);
const STORAGE_KEY = "meeplemeter-data-v1";
const useFirestoreBackend = dataBackend === "firestore";

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

function cleanForFirestore(value) {
  if (Array.isArray(value)) {
    return value.map(cleanForFirestore);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, cleanForFirestore(entryValue)]),
    );
  }

  return value;
}

function groupCollectionRef(collectionName) {
  return collection(firestoreDb, "groups", firebaseGroupId, collectionName);
}

function groupDocRef(collectionName, documentId) {
  return doc(firestoreDb, "groups", firebaseGroupId, collectionName, documentId);
}

function getStoredDefaults() {
  const storedData = loadStoredData();

  return {
    games: (storedData?.games ?? initialGames).map(normalizeGame),
    plays: storedData?.plays ?? initialPlays,
    playerProfiles: (storedData?.playerProfiles ?? []).map(normalizePlayerProfile),
  };
}

function normalizeParticipants(participants = [], scoringMode = "none") {
  return participants
    .filter((participant) => participant.name.trim())
    .map((participant) => ({
      name: participant.name.trim(),
      score: scoringMode === "none" ? null : Number(participant.score) || 0,
      scoreDetails: participant.scoreDetails ?? {},
      roundScores: participant.roundScores ?? {},
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
    isRoundGame: Boolean(game.isRoundGame),
    roundScoringMode: game.roundScoringMode === "minus" ? "minus" : "plus",
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
    isRoundGame: Boolean(gameInput.isRoundGame ?? existingGame.isRoundGame),
    roundScoringMode: gameInput.roundScoringMode ?? existingGame.roundScoringMode ?? "plus",
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
    useDetailedScoring: Boolean(playInput.useDetailedScoring),
    roundCompleted: playInput.roundCompleted ?? existingPlay.roundCompleted ?? {},
    winner: calculateWinner(participants, scoringMode, playInput.winner),
    duration: Number(playInput.duration) || selectedGame?.duration || 0,
    note: playInput.note.trim() || "Keine Notiz erfasst.",
  };
}

function sortPlaysByGameDate(playList) {
  return [...playList].sort((first, second) => {
    const firstTime = new Date(first.date ?? 0).getTime();
    const secondTime = new Date(second.date ?? 0).getTime();

    if (secondTime !== firstTime) {
      return secondTime - firstTime;
    }

    return String(second.id ?? "").localeCompare(String(first.id ?? ""), "de");
  });
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
  const { user, userProfile } = useAuth();
  const shouldUseFirestore =
    useFirestoreBackend && isFirebaseConfigured && firestoreDb && Boolean(user && userProfile);
  const [games, setGames] = useState(() => getStoredDefaults().games);
  const [plays, setPlays] = useState(() => getStoredDefaults().plays);
  const [playerProfiles, setPlayerProfiles] = useState(() => getStoredDefaults().playerProfiles);
  const [isDataLoading, setIsDataLoading] = useState(shouldUseFirestore);

  useEffect(() => {
    if (!shouldUseFirestore) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ games, plays, playerProfiles }));
    }
  }, [games, plays, playerProfiles, shouldUseFirestore]);

  useEffect(() => {
    if (!shouldUseFirestore) {
      setIsDataLoading(false);
      return undefined;
    }

    setIsDataLoading(true);

    const unsubscribers = [
      onSnapshot(groupCollectionRef("games"), (snapshot) => {
        setGames(snapshot.docs.map((entry) => normalizeGame({ id: entry.id, ...entry.data() })));
        setIsDataLoading(false);
      }),
      onSnapshot(groupCollectionRef("plays"), (snapshot) => {
        setPlays(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      }),
      onSnapshot(groupCollectionRef("playerProfiles"), (snapshot) => {
        setPlayerProfiles(
          snapshot.docs.map((entry) => normalizePlayerProfile({ name: entry.id, ...entry.data() })),
        );
      }),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [shouldUseFirestore]);

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
  const sortedPlays = useMemo(() => sortPlaysByGameDate(plays), [plays]);

  function addGame(gameInput) {
    if (shouldUseFirestore) {
      const alreadyExists = games.some(
        (game) =>
          (gameInput.bggId && game.bggId === gameInput.bggId) ||
          normalizeTitle(game.title) === normalizeTitle(gameInput.title),
      );

      if (alreadyExists) {
        return false;
      }

      const id = createId();
      const game = { id, ...buildGame(gameInput), createdAt: serverTimestamp() };
      setDoc(groupDocRef("games", id), cleanForFirestore(game));
      return true;
    }

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
      return [{ id: createId(), ...buildGame(gameInput), createdAt: new Date().toISOString() }, ...currentGames];
    });

    return wasAdded;
  }

  function addGames(gameInputs) {
    const existingTitles = new Set(games.map((game) => normalizeTitle(game.title)));
    const existingBggIds = new Set(games.map((game) => game.bggId).filter(Boolean));
    const nextGames = [];

    for (const gameInput of gameInputs) {
      const normalizedTitle = normalizeTitle(gameInput.title);
      const hasBggDuplicate = gameInput.bggId && existingBggIds.has(gameInput.bggId);

      if (!normalizedTitle || existingTitles.has(normalizedTitle) || hasBggDuplicate) {
        continue;
      }

      existingTitles.add(normalizedTitle);

      if (gameInput.bggId) {
        existingBggIds.add(gameInput.bggId);
      }

      nextGames.push({ id: createId(), ...buildGame(gameInput), createdAt: new Date().toISOString() });
    }

    if (shouldUseFirestore && nextGames.length) {
      const batch = writeBatch(firestoreDb);

      nextGames.forEach((game) => {
        batch.set(groupDocRef("games", game.id), cleanForFirestore({ ...game, createdAt: serverTimestamp() }));
      });

      batch.commit();
      return nextGames.length;
    }

    if (nextGames.length) {
      setGames((currentGames) => [...nextGames, ...currentGames]);
    }

    return nextGames.length;
  }

  function updateGame(gameId, gameInput) {
    if (shouldUseFirestore) {
      const existingGame = games.find((game) => game.id === gameId);
      const game = buildGame(gameInput, existingGame);
      setDoc(
        groupDocRef("games", gameId),
        cleanForFirestore({ id: gameId, ...game, updatedAt: serverTimestamp() }),
        { merge: true },
      );

      plays
        .filter((play) => play.gameId === gameId)
        .forEach((play) => {
          setDoc(
            groupDocRef("plays", play.id),
            { game: gameInput.title.trim() || play.game, updatedAt: serverTimestamp() },
            { merge: true },
          );
        });
      return;
    }

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
    if (shouldUseFirestore) {
      deleteDoc(groupDocRef("games", gameId));
      plays
        .filter((play) => play.gameId === gameId)
        .forEach((play) => deleteDoc(groupDocRef("plays", play.id)));
      return;
    }

    setGames((currentGames) => currentGames.filter((game) => game.id !== gameId));
    setPlays((currentPlays) => currentPlays.filter((play) => play.gameId !== gameId));
  }

  function updateGameScoreCategories(gameId, scoreCategories) {
    if (shouldUseFirestore) {
      setDoc(
        groupDocRef("games", gameId),
        {
          scoreCategories: normalizeScoreCategories(scoreCategories),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

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
      createdAt: new Date().toISOString(),
    };

    if (shouldUseFirestore) {
      setDoc(groupDocRef("plays", play.id), cleanForFirestore({ ...play, createdAt: serverTimestamp() }));
      return;
    }

    setPlays((currentPlays) => [play, ...currentPlays]);
  }

  function addPlays(playInputs) {
    const nextPlays = playInputs.map((playInput) => ({
      id: createId(),
      ...buildPlay(playInput, games),
      createdAt: new Date().toISOString(),
    }));

    if (shouldUseFirestore) {
      const batch = writeBatch(firestoreDb);

      nextPlays.forEach((play) => {
        batch.set(groupDocRef("plays", play.id), cleanForFirestore({ ...play, createdAt: serverTimestamp() }));
      });

      batch.commit();
      return nextPlays.length;
    }

    setPlays((currentPlays) => [...nextPlays, ...currentPlays]);
    return nextPlays.length;
  }

  function updatePlay(playId, playInput) {
    if (shouldUseFirestore) {
      const existingPlay = plays.find((play) => play.id === playId);
      setDoc(
        groupDocRef("plays", playId),
        cleanForFirestore({
          id: playId,
          ...buildPlay(playInput, games, existingPlay),
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      return;
    }

    setPlays((currentPlays) =>
      currentPlays.map((play) =>
        play.id === playId ? buildPlay(playInput, games, play) : play,
      ),
    );
  }

  function deletePlay(playId) {
    if (shouldUseFirestore) {
      deleteDoc(groupDocRef("plays", playId));
      return;
    }

    setPlays((currentPlays) => currentPlays.filter((play) => play.id !== playId));
  }

  function updatePlayerProfile(playerName, profileInput) {
    const normalizedProfile = normalizePlayerProfile({
      ...profileInput,
      name: playerName,
    });

    if (shouldUseFirestore) {
      setDoc(
        groupDocRef("playerProfiles", normalizedProfile.name),
        cleanForFirestore({ ...normalizedProfile, updatedAt: serverTimestamp() }),
        { merge: true },
      );
      return;
    }

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

    if (shouldUseFirestore) {
      const existingProfile = playerProfiles.find(
        (profile) => profile.name.toLowerCase() === normalizedPlayerName,
      );
      const deletedProfile = existingProfile
        ? { ...existingProfile, isDeleted: true, accountStatus: "deleted" }
        : {
            name: playerName.trim(),
            favoriteGame: "",
            favoriteColor: "",
            accountEmail: "",
            accountUsername: "",
            accountStatus: "deleted",
            isDeleted: true,
            notes: "",
          };

      setDoc(
        groupDocRef("playerProfiles", deletedProfile.name),
        cleanForFirestore({ ...deletedProfile, updatedAt: serverTimestamp() }),
        { merge: true },
      );
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

    if (shouldUseFirestore) {
      plays.forEach((play) => {
        const nextPlay = {
          ...play,
          winner: play.winner?.trim().toLowerCase() === normalizedOldName ? trimmedNewName : play.winner,
          participants: (play.participants ?? []).map((participant) =>
            participant.name?.trim().toLowerCase() === normalizedOldName
              ? { ...participant, name: trimmedNewName }
              : participant,
          ),
        };

        if (JSON.stringify(nextPlay) !== JSON.stringify(play)) {
          setDoc(
            groupDocRef("plays", play.id),
            cleanForFirestore({ ...nextPlay, updatedAt: serverTimestamp() }),
            { merge: true },
          );
        }
      });

      const profile = playerProfiles.find(
        (entry) => entry.name?.trim().toLowerCase() === normalizedOldName,
      );

      if (profile) {
        deleteDoc(groupDocRef("playerProfiles", profile.name));
        setDoc(
          groupDocRef("playerProfiles", trimmedNewName),
          cleanForFirestore({
            ...profile,
            name: trimmedNewName,
            accountUsername: trimmedNewName,
            updatedAt: serverTimestamp(),
          }),
        );
      }
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
    if (shouldUseFirestore) {
      resetFirestoreData(options);
      return;
    }

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

  async function resetFirestoreData(options) {
    const collectionsToReset = [
      options.resetGames ? "games" : null,
      options.resetPlays ? "plays" : null,
      options.resetPlayers ? "playerProfiles" : null,
    ].filter(Boolean);

    for (const collectionName of collectionsToReset) {
      const snapshot = await getDocs(groupCollectionRef(collectionName));
      const batch = writeBatch(firestoreDb);

      snapshot.docs.forEach((entry) => {
        batch.delete(entry.ref);
      });

      await batch.commit();
    }
  }

  async function importLocalDataToFirestore() {
    if (!shouldUseFirestore) {
      return { games: 0, plays: 0, playerProfiles: 0 };
    }

    const localData = loadStoredData();

    if (!localData) {
      return { games: 0, plays: 0, playerProfiles: 0 };
    }

    const batch = writeBatch(firestoreDb);
    const localGames = (localData.games ?? []).map(normalizeGame);
    const localPlays = localData.plays ?? [];
    const localPlayerProfiles = (localData.playerProfiles ?? []).map(normalizePlayerProfile);

    localGames.forEach((game) => {
      const id = game.id || createId();
      batch.set(groupDocRef("games", id), cleanForFirestore({ ...game, id, importedAt: serverTimestamp() }), {
        merge: true,
      });
    });

    localPlays.forEach((play) => {
      const id = play.id || createId();
      batch.set(groupDocRef("plays", id), cleanForFirestore({ ...play, id, importedAt: serverTimestamp() }), {
        merge: true,
      });
    });

    localPlayerProfiles.forEach((profile) => {
      if (profile.name) {
        batch.set(
          groupDocRef("playerProfiles", profile.name),
          cleanForFirestore({ ...profile, importedAt: serverTimestamp() }),
          { merge: true },
        );
      }
    });

    await batch.commit();

    return {
      games: localGames.length,
      plays: localPlays.length,
      playerProfiles: localPlayerProfiles.length,
    };
  }

  const value = useMemo(
    () => ({
      games,
      plays: sortedPlays,
      playerProfiles,
      stats,
      dataBackend: shouldUseFirestore ? "firestore" : "local",
      isDataLoading,
      addGame,
      addGames,
      updateGame,
      updateGameScoreCategories,
      deleteGame,
      addPlay,
      addPlays,
      updatePlay,
      deletePlay,
      updatePlayerProfile,
      deletePlayer,
      renamePlayer,
      resetLocalData,
      importLocalDataToFirestore,
    }),
    [games, sortedPlays, playerProfiles, stats, shouldUseFirestore, isDataLoading],
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

