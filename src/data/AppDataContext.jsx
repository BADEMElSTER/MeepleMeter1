import { createContext, useContext, useMemo, useState } from "react";
import { games as initialGames, plays as initialPlays } from "./mockData.js";

const AppDataContext = createContext(null);

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

export function AppDataProvider({ children }) {
  const [games, setGames] = useState(initialGames);
  const [plays, setPlays] = useState(initialPlays);

  const stats = useMemo(() => {
    const totalDuration = plays.reduce((sum, play) => sum + Number(play.duration), 0);
    const gamesWithPlayCounts = games.map((game) => ({
      ...game,
      plays: plays.filter((play) => play.gameId === game.id || play.game === game.title).length,
    }));
    const fallbackGame = gamesWithPlayCounts[0] ?? {
      title: "Noch kein Spiel",
      rating: 0,
      plays: 0,
    };

    return {
      totalGames: games.length,
      totalPlays: plays.length,
      averageDuration: plays.length ? Math.round(totalDuration / plays.length) : 0,
      favoriteGame:
        gamesWithPlayCounts.toSorted((a, b) => Number(b.rating) - Number(a.rating))[0] ??
        fallbackGame,
      mostPlayedGame:
        gamesWithPlayCounts.toSorted((a, b) => Number(b.plays) - Number(a.plays))[0] ??
        fallbackGame,
      gamesWithPlayCounts,
    };
  }, [games, plays]);

  function addGame(gameInput) {
    const game = {
      id: crypto.randomUUID(),
      title: gameInput.title.trim(),
      category: gameInput.category.trim() || "Nicht kategorisiert",
      players: gameInput.players.trim() || "1+",
      duration: Number(gameInput.duration) || 0,
      plays: 0,
      rating: Number(gameInput.rating) || 0,
    };

    setGames((currentGames) => [game, ...currentGames]);
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

  const value = useMemo(
    () => ({ games, plays, stats, addGame, addPlay, updatePlay }),
    [games, plays, stats],
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
