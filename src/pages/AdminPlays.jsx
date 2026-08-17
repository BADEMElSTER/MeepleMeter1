import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../data/AppDataContext.jsx";

export default function AdminPlays() {
  const { plays, deletePlay } = useAppData();
  const [selectedPlayIds, setSelectedPlayIds] = useState([]);
  const [gameFilter, setGameFilter] = useState("all");
  const [winnerFilter, setWinnerFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });

  const gameNames = useMemo(
    () => [...new Set(plays.map((play) => play.game).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de")),
    [plays],
  );
  const winnerNames = useMemo(
    () => [...new Set(plays.map((play) => play.winner).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de")),
    [plays],
  );
  const filteredPlays = useMemo(
    () =>
      [...plays]
        .filter((play) => {
          const playDate = new Date(play.date);
          const matchesGame = gameFilter === "all" || play.game === gameFilter;
          const matchesWinner = winnerFilter === "all" || play.winner === winnerFilter;
          const matchesFrom = !fromDate || playDate >= new Date(fromDate);
          const matchesTo = !toDate || playDate <= new Date(`${toDate}T23:59:59`);

          return matchesGame && matchesWinner && matchesFrom && matchesTo;
        })
        .sort((firstPlay, secondPlay) =>
          compareValues(
            getPlaySortValue(firstPlay, sortConfig.key),
            getPlaySortValue(secondPlay, sortConfig.key),
            sortConfig.direction,
          ),
        ),
    [fromDate, gameFilter, plays, sortConfig, toDate, winnerFilter],
  );

  function updateSort(key) {
    setSortConfig((currentSort) => ({
      key,
      direction: currentSort.key === key && currentSort.direction === "asc" ? "desc" : "asc",
    }));
  }

  function toggleSelection(playId) {
    setSelectedPlayIds((currentIds) =>
      currentIds.includes(playId)
        ? currentIds.filter((selectedId) => selectedId !== playId)
        : [...currentIds, playId],
    );
  }

  function deleteSelectedPlays() {
    if (!selectedPlayIds.length) return;
    const confirmed = window.confirm(`${selectedPlayIds.length} Partien löschen?`);

    if (confirmed) {
      selectedPlayIds.forEach(deletePlay);
      setSelectedPlayIds([]);
    }
  }

  return (
    <section className="page">
      <div className="page-heading row-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Partien verwalten.</h1>
        </div>
        <Link className="ghost-button" to="/admin">Zur Admin-Übersicht</Link>
      </div>

      <div className="panel admin-filter-panel">
        <label>Spiel
          <select value={gameFilter} onChange={(event) => setGameFilter(event.target.value)}>
            <option value="all">Alle Spiele</option>
            {gameNames.map((gameName) => <option key={gameName} value={gameName}>{gameName}</option>)}
          </select>
        </label>
        <label>Gewinner
          <select value={winnerFilter} onChange={(event) => setWinnerFilter(event.target.value)}>
            <option value="all">Alle Gewinner</option>
            {winnerNames.map((winnerName) => <option key={winnerName} value={winnerName}>{winnerName}</option>)}
          </select>
        </label>
        <label>Von<input value={fromDate} type="date" onChange={(event) => setFromDate(event.target.value)} /></label>
        <label>Bis<input value={toDate} type="date" onChange={(event) => setToDate(event.target.value)} /></label>
      </div>

      <article className="table-card admin-table-card">
        <div className="panel-header row-heading">
          <div><p className="eyebrow">{filteredPlays.length} Treffer</p><h2>Partien auswählen</h2></div>
          <button className="ghost-button danger-action" type="button" disabled={!selectedPlayIds.length} onClick={deleteSelectedPlays}>
            Auswahl löschen ({selectedPlayIds.length})
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr>
              <th>Auswahl</th>
              <th><SortButton columnKey="date" label="Spieldatum" sortConfig={sortConfig} onSort={updateSort} /></th>
              <th><SortButton columnKey="game" label="Spiel" sortConfig={sortConfig} onSort={updateSort} /></th>
              <th><SortButton columnKey="winner" label="Gewinner" sortConfig={sortConfig} onSort={updateSort} /></th>
              <th><SortButton columnKey="players" label="Mitspieler" sortConfig={sortConfig} onSort={updateSort} /></th>
              <th><SortButton columnKey="duration" label="Dauer" sortConfig={sortConfig} onSort={updateSort} /></th>
              <th><SortButton columnKey="createdAt" label="Ergebnis erstellt" sortConfig={sortConfig} onSort={updateSort} /></th>
            </tr></thead>
            <tbody>{filteredPlays.map((play) => (
              <tr key={play.id}>
                <td><input aria-label={`${play.game} auswählen`} checked={selectedPlayIds.includes(play.id)} type="checkbox" onChange={() => toggleSelection(play.id)} /></td>
                <td>{formatDate(play.date)}</td>
                <td><strong>{play.game}</strong></td>
                <td>{play.winner}</td>
                <td>{play.players}</td>
                <td>{play.duration} Min.</td>
                <td>{formatCreatedAt(play.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function SortButton({ columnKey, label, sortConfig, onSort }) {
  const isActive = sortConfig.key === columnKey;
  return (
    <button className="sort-button" type="button" onClick={() => onSort(columnKey)} aria-label={`${label} ${isActive && sortConfig.direction === "asc" ? "absteigend" : "aufsteigend"} sortieren`}>
      {label}<span aria-hidden="true">{isActive ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

function getPlaySortValue(play, key) {
  if (key === "date" || key === "createdAt") return getTimestamp(play[key]);
  return play[key];
}

function compareValues(firstValue, secondValue, direction) {
  const multiplier = direction === "asc" ? 1 : -1;
  const firstMissing = firstValue === null || firstValue === undefined || firstValue === "";
  const secondMissing = secondValue === null || secondValue === undefined || secondValue === "";
  if (firstMissing && secondMissing) return 0;
  if (firstMissing) return 1;
  if (secondMissing) return -1;
  if (typeof firstValue === "number" && typeof secondValue === "number") return (firstValue - secondValue) * multiplier;
  return String(firstValue).localeCompare(String(secondValue), "de", { numeric: true }) * multiplier;
}

function getTimestamp(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value === "object" && Number.isFinite(value.seconds)) return value.seconds * 1000;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatDate(value) {
  const timestamp = getTimestamp(value);
  return timestamp ? new Date(timestamp).toLocaleDateString("de-DE") : "–";
}

function formatCreatedAt(value) {
  const timestamp = getTimestamp(value);
  return timestamp ? new Date(timestamp).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "–";
}
