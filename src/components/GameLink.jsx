import { Link } from "react-router-dom";
import { useAppData } from "../data/AppDataContext.jsx";

export default function GameLink({ gameId, title, children, className = "" }) {
  const { games } = useAppData();
  const game =
    games.find((entry) => entry.id === gameId) ??
    games.find((entry) => entry.title.trim().toLowerCase() === title?.trim().toLowerCase());

  if (!game) {
    return children ?? title ?? "Unbekanntes Spiel";
  }

  return (
    <Link className={`game-link ${className}`.trim()} to={`/games/${game.id}`}>
      {children ?? game.title}
    </Link>
  );
}
