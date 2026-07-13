import { Link } from "react-router-dom";

export default function PlayerLink({ name, children, className = "" }) {
  const playerName = name?.trim();

  if (!playerName || playerName === "Nicht erfasst") {
    return children ?? name ?? "–";
  }

  return (
    <Link className={`player-link ${className}`.trim()} to={`/players/${encodeURIComponent(playerName)}`}>
      {children ?? playerName}
    </Link>
  );
}
