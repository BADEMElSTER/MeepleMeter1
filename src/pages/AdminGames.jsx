import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Field from "../components/Field.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

function getGameForm(game) {
  return {
    title: game.title ?? "",
    category: game.category ?? "",
    owner: game.owner ?? "",
    catalogYear: game.catalogYear ? String(game.catalogYear) : "",
    minPlayers: String(game.minPlayers ?? 1),
    maxPlayers: String(game.maxPlayers ?? 1),
    duration: String(game.duration ?? 0),
    expansions: (game.expansions ?? []).map((expansion) => expansion.name).join(", "),
    bggId: game.bggId ?? null,
    catalogId: game.catalogId ?? null,
    catalogRank: game.catalogRank ?? null,
    catalogRating: game.catalogRating ?? null,
    catalogImage: game.catalogImage ?? null,
    catalogExpansions: game.catalogExpansions ?? [],
    scoreCategories: game.scoreCategories ?? [],
  };
}

export default function AdminGames() {
  const { games, plays, updateGame, deleteGame } = useAppData();
  const [selectedGameIds, setSelectedGameIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [playFilter, setPlayFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "title", direction: "asc" });
  const [editingGame, setEditingGame] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editMessage, setEditMessage] = useState("");

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
        .sort((firstGame, secondGame) =>
          compareValues(
            getGameSortValue(firstGame, sortConfig.key, playCounts),
            getGameSortValue(secondGame, sortConfig.key, playCounts),
            sortConfig.direction,
          ),
        ),
    [categoryFilter, games, playCounts, playFilter, searchQuery, sortConfig],
  );

  function updateSort(key) {
    setSortConfig((currentSort) => ({
      key,
      direction: currentSort.key === key && currentSort.direction === "asc" ? "desc" : "asc",
    }));
  }

  function toggleSelection(gameId) {
    setSelectedGameIds((currentIds) =>
      currentIds.includes(gameId)
        ? currentIds.filter((selectedId) => selectedId !== gameId)
        : [...currentIds, gameId],
    );
  }

  function openEditor(game) {
    setEditingGame(game);
    setEditForm(getGameForm(game));
    setEditMessage("");
  }

  function closeEditor() {
    setEditingGame(null);
    setEditForm(null);
    setEditMessage("");
  }

  function updateEditField(field, value) {
    setEditForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function saveGame(event) {
    event.preventDefault();

    const minPlayers = Number(editForm.minPlayers);
    const maxPlayers = Number(editForm.maxPlayers);

    if (!editForm.title.trim()) {
      setEditMessage("Bitte einen Spieltitel eingeben.");
      return;
    }

    if (minPlayers < 1 || maxPlayers < minPlayers) {
      setEditMessage("Die maximale Spielerzahl muss mindestens der minimalen Spielerzahl entsprechen.");
      return;
    }

    updateGame(editingGame.id, editForm);
    closeEditor();
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
          <h1>Spiele verwalten.</h1>
          <p className="page-intro">Spieldaten bearbeiten oder mehrere Spiele auswählen und löschen.</p>
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
            <h2>Spiele bearbeiten</h2>
          </div>
          <button
            className="ghost-button danger-action"
            type="button"
            disabled={!selectedGameIds.length}
            onClick={deleteSelectedGames}
          >
            Auswahl löschen ({selectedGameIds.length})
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Auswahl</th>
                <th><SortButton columnKey="title" label="Spiel" sortConfig={sortConfig} onSort={updateSort} /></th>
                <th><SortButton columnKey="category" label="Kategorie" sortConfig={sortConfig} onSort={updateSort} /></th>
                <th><SortButton columnKey="minPlayers" label="Spieler" sortConfig={sortConfig} onSort={updateSort} /></th>
                <th><SortButton columnKey="catalogYear" label="Jahr" sortConfig={sortConfig} onSort={updateSort} /></th>
                <th><SortButton columnKey="plays" label="Partien" sortConfig={sortConfig} onSort={updateSort} /></th>
                <th><SortButton columnKey="createdAt" label="Erstellt" sortConfig={sortConfig} onSort={updateSort} /></th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map((game) => (
                <tr key={game.id}>
                  <td>
                    <input
                      aria-label={`${game.title} auswählen`}
                      checked={selectedGameIds.includes(game.id)}
                      type="checkbox"
                      onChange={() => toggleSelection(game.id)}
                    />
                  </td>
                  <td><strong>{game.title}</strong></td>
                  <td>{game.category || "–"}</td>
                  <td>{game.minPlayers}–{game.maxPlayers}</td>
                  <td>{game.catalogYear ?? "–"}</td>
                  <td>{playCounts[game.id] ?? 0}</td>
                  <td>{formatCreatedAt(game.createdAt)}</td>
                  <td>
                    <button className="button button-secondary admin-edit-button" type="button" onClick={() => openEditor(game)}>
                      Bearbeiten
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {editingGame && editForm && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}>
          <form className="dialog-card admin-game-editor" role="dialog" aria-modal="true" aria-labelledby="edit-game-title" onSubmit={saveGame}>
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Spiel bearbeiten</p>
                <h2 id="edit-game-title">{editingGame.title}</h2>
              </div>
              <button className="ghost-button" type="button" onClick={closeEditor}>Schließen</button>
            </div>

            <div className="form-grid admin-game-edit-grid">
              <Field label="Titel">
                <input required autoFocus value={editForm.title} onChange={(event) => updateEditField("title", event.target.value)} />
              </Field>
              <Field label="Eigentümer / Benutzer">
                <input value={editForm.owner} onChange={(event) => updateEditField("owner", event.target.value)} placeholder="Nicht zugeordnet" />
              </Field>
              <Field label="Kategorie">
                <input value={editForm.category} onChange={(event) => updateEditField("category", event.target.value)} />
              </Field>
              <Field label="Jahr">
                <input min="1900" max="2100" type="number" value={editForm.catalogYear} onChange={(event) => updateEditField("catalogYear", event.target.value)} />
              </Field>
              <Field label="Min. Spieler">
                <input min="1" required type="number" value={editForm.minPlayers} onChange={(event) => updateEditField("minPlayers", event.target.value)} />
              </Field>
              <Field label="Max. Spieler">
                <input min={editForm.minPlayers || 1} required type="number" value={editForm.maxPlayers} onChange={(event) => updateEditField("maxPlayers", event.target.value)} />
              </Field>
              <Field label="Spielzeit in Minuten">
                <input min="0" type="number" value={editForm.duration} onChange={(event) => updateEditField("duration", event.target.value)} />
              </Field>
              <Field label="Erweiterungen">
                <textarea value={editForm.expansions} onChange={(event) => updateEditField("expansions", event.target.value)} placeholder="Mit Komma oder Zeilenumbruch trennen" />
              </Field>
            </div>

            {editMessage && <p className="form-message" role="alert">{editMessage}</p>}
            <div className="dialog-actions">
              <button className="button button-secondary" type="button" onClick={closeEditor}>Abbrechen</button>
              <button className="button" type="submit">Änderungen speichern</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function SortButton({ columnKey, label, sortConfig, onSort }) {
  const isActive = sortConfig.key === columnKey;

  return (
    <button
      className="sort-button"
      type="button"
      onClick={() => onSort(columnKey)}
      aria-label={`${label} ${isActive && sortConfig.direction === "asc" ? "absteigend" : "aufsteigend"} sortieren`}
    >
      {label}
      <span aria-hidden="true">{isActive ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

function getGameSortValue(game, key, playCounts) {
  if (key === "plays") return playCounts[game.id] ?? 0;
  if (key === "createdAt") return getTimestamp(game.createdAt);
  return game[key];
}

function compareValues(firstValue, secondValue, direction) {
  const multiplier = direction === "asc" ? 1 : -1;
  const firstMissing = firstValue === null || firstValue === undefined || firstValue === "";
  const secondMissing = secondValue === null || secondValue === undefined || secondValue === "";

  if (firstMissing && secondMissing) return 0;
  if (firstMissing) return 1;
  if (secondMissing) return -1;
  if (typeof firstValue === "number" && typeof secondValue === "number") {
    return (firstValue - secondValue) * multiplier;
  }
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

function formatCreatedAt(value) {
  const timestamp = getTimestamp(value);
  return timestamp
    ? new Date(timestamp).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })
    : "–";
}
