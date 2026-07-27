import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../data/AppDataContext.jsx";

export default function AdminGames() {
  const { games, plays, deleteGame } = useAppData();
  const [selectedGameIds, setSelectedGameIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [playFilter, setPlayFilter] = useState("all");

  const categories = useMemo(
    () => [...new Set(games.map((game) => game.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de")),
    [games],
  );
  const playCounts = useMemo(
    () =>
      Object.fromEntries(
        games.map((game) => [
          game.id,
          plays.filter(
            (play) =>
              play.gameId === game.id ||
              play.game.trim().toLowerCase() === game.title.trim().toLowerCase(),
          ).length,
        ]),
      ),
    [games, plays],
  );
  const filteredGames = useMemo(
    () =>
      [...games]
        .filter((game) => {
          const matchesSearch = game.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
          const matchesCategory = categoryFilter === "all" || game.category === categoryFilter;
          const count = playCounts[game.id] ?? 0;
          const matchesPlays =
            playFilter === "all" ||
            (playFilter === "played" && count > 0) ||
            (playFilter === "unplayed" && count === 0);

          return matchesSearch && matchesCategory && matchesPlays;
        })
        .sort((firstGame, secondGame) => firstGame.title.localeCompare(secondGame.title, "de")),
    [categoryFilter, games, playCounts, playFilter, searchQuery],
  );

  function toggleSelection(gameId) {
    setSelectedGameIds((currentIds) =>
      currentIds.includes(gameId)
        ? currentIds.filter((selectedId) => selectedId !== gameId)
        : [...currentIds, gameId],
    );
  }

  function deleteSelectedGames() {
    if (!selectedGameIds.length) {
      return;
    }

    const confirmed = window.confirm(
      `${selectedGameIds.length} Spiele löschen? Zugehörige Partien werden ebenfalls gelöscht.`,
    );

    if (confirmed) {
      selectedGameIds.forEach(deleteGame);
      setSelectedGameIds([]);
    }
  }

  return (
    <section className="page">
      <div className="page-heading row-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Spiele löschen.</h1>
        </div>
        <Link className="ghost-button" to="/admin">
          Zur Admin-Übersicht
        </Link>
      </div>

      <div className="panel admin-filter-panel">
        <label>
          Suche
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Spiel suchen"
          />
        </label>
        <label>
          Kategorie
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">Alle Kategorien</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Partien
          <select value={playFilter} onChange={(event) => setPlayFilter(event.target.value)}>
            <option value="all">Alle Spiele</option>
            <option value="played">Nur gespielte</option>
            <option value="unplayed">Nur ungespielte</option>
          </select>
        </label>
      </div>

      <article className="table-card admin-table-card">
        <div className="panel-header row-heading">
          <div>
            <p className="eyebrow">{filteredGames.length} Treffer</p>
            <h2>Spiele auswählen</h2>
          </div>
          <button className="ghost-button danger-action" type="button" onClick={deleteSelectedGames}>
            Auswahl löschen ({selectedGameIds.length})
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Auswahl</th>
              <th>Spiel</th>
              <th>Kategorie</th>
              <th>Jahr</th>
              <th>Partien</th>
            </tr>
          </thead>
          <tbody>
            {filteredGames.map((game) => (
              <tr key={game.id}>
                <td>
                  <input
                    checked={selectedGameIds.includes(game.id)}
                    type="checkbox"
                    onChange={() => toggleSelection(game.id)}
                  />
                </td>
                <td>
                  <strong>{game.title}</strong>
                </td>
                <td>{game.category}</td>
                <td>{game.catalogYear ?? "–"}</td>
                <td>{playCounts[game.id] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
