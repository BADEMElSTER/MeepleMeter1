import { Link } from "react-router-dom";
import { useAppData } from "../data/AppDataContext.jsx";

export default function PlayerLink({ name, children, className = "" }) {
  const { playerProfiles } = useAppData();
  const playerName = name?.trim();
  const isDeleted = playerProfiles.some(
    (profile) => profile.isDeleted && profile.name?.trim().toLowerCase() === playerName?.toLowerCase(),
  );

  if (!playerName || playerName === "Nicht erfasst") {
    return children ?? name ?? "\u2013";
  }

  return (
    <Link
      className={`player-link ${isDeleted ? "deleted-player-link" : ""} ${className}`.trim()}
      title={isDeleted ? "Gelöschter Mitspieler" : undefined}
      to={`/players/${encodeURIComponent(playerName)}`}
    >
      {children ?? playerName}
    </Link>
  );
}
