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
        .sort((firstPlay, secondPlay) => new Date(secondPlay.date) - new Date(firstPlay.date)),
    [fromDate, gameFilter, plays, toDate, winnerFilter],
  );

  function toggleSelection(playId) {
    setSelectedPlayIds((currentIds) =>
      currentIds.includes(playId)
        ? currentIds.filter((selectedId) => selectedId !== playId)
        : [...currentIds, playId],
    );
  }

  function deleteSelectedPlays() {
    if (!selectedPlayIds.length) {
      return;
    }

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
          <h1>Partien löschen.</h1>
        </div>
        <Link className="ghost-button" to="/admin">
          Zur Admin-Übersicht
        </Link>
      </div>

      <div className="panel admin-filter-panel">
        <label>
          Spiel
          <select value={gameFilter} onChange={(event) => setGameFilter(event.target.value)}>
            <option value="all">Alle Spiele</option>
            {gameNames.map((gameName) => (
              <option key={gameName} value={gameName}>
                {gameName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Gewinner
          <select value={winnerFilter} onChange={(event) => setWinnerFilter(event.target.value)}>
            <option value="all">Alle Gewinner</option>
            {winnerNames.map((winnerName) => (
              <option key={winnerName} value={winnerName}>
                {winnerName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Von
          <input value={fromDate} type="date" onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label>
          Bis
          <input value={toDate} type="date" onChange={(event) => setToDate(event.target.value)} />
        </label>
      </div>

      <article className="table-card admin-table-card">
        <div className="panel-header row-heading">
          <div>
            <p className="eyebrow">{filteredPlays.length} Treffer</p>
            <h2>Partien auswählen</h2>
          </div>
          <button className="ghost-button danger-action" type="button" onClick={deleteSelectedPlays}>
            Auswahl löschen ({selectedPlayIds.length})
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Auswahl</th>
              <th>Datum</th>
              <th>Spiel</th>
              <th>Gewinner</th>
              <th>Mitspieler</th>
              <th>Dauer</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlays.map((play) => (
              <tr key={play.id}>
                <td>
                  <input
                    checked={selectedPlayIds.includes(play.id)}
                    type="checkbox"
                    onChange={() => toggleSelection(play.id)}
                  />
                </td>
                <td>{new Date(play.date).toLocaleDateString("de-DE")}</td>
                <td>
                  <strong>{play.game}</strong>
                </td>
                <td>{play.winner}</td>
                <td>{play.players}</td>
                <td>{play.duration} Min.</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
