import { Link } from "react-router-dom";
import { useAppData } from "../data/AppDataContext.jsx";

export default function GameLink({ gameId, title, children, className = "" }) {
  const { games } = useAppData();
  const linkText = children ?? title ?? "Unbekanntes Spiel";
  const game =
    games.find((entry) => entry.id === gameId) ??
    games.find((entry) => entry.title.trim().toLowerCase() === title?.trim().toLowerCase());

  if (game) {
    return (
      <Link className={`game-link ${className}`.trim()} to={`/games/${game.id}`}>
        {linkText}
      </Link>
    );
  }

  if (!title) {
    return linkText;
  }

  return (
    <Link className={`game-link ${className}`.trim()} to={`/games/by-title/${encodeURIComponent(title)}`}>
      {linkText}
    </Link>
  );
}
