import { useState } from "react";
import Field from "../components/Field.jsx";
import GameLink from "../components/GameLink.jsx";
import { useAppData } from "../data/AppDataContext.jsx";
import { gameCatalog } from "../data/gameCatalog.js";

const initialForm = {
  title: "",
  category: "",
  minPlayers: "1",
  maxPlayers: "4",
  duration: "",
  bggId: null,
  catalogId: null,
  catalogYear: null,
  catalogRank: null,
  catalogRating: null,
  catalogImage: null,
  catalogExpansions: [],
  expansions: "",
};

const sortableColumns = [
  { key: "title", label: "Spiel", type: "text" },
  { key: "category", label: "Kategorie", type: "text" },
  { key: "catalogYear", label: "Jahr", type: "number" },
  { key: "minPlayers", label: "Min.", type: "number" },
  { key: "maxPlayers", label: "Max.", type: "number" },
  { key: "duration", label: "Vorgegebene Spielzeit", type: "number" },
  { key: "averagePlayedDuration", label: "Ø tatsächliche Spielzeit", type: "number" },
  { key: "expansionCount", label: "Erweiterungen", type: "number" },
  { key: "plays", label: "Partien", type: "number" },
];

function getGameForm(game) {
  return {
    title: game.title,
    category: game.category,
    minPlayers: String(game.minPlayers),
    maxPlayers: String(game.maxPlayers),
    duration: String(game.duration),
    bggId: game.bggId ?? null,
    catalogId: game.catalogId ?? null,
    catalogYear: game.catalogYear ?? null,
    catalogRank: game.catalogRank ?? null,
    catalogRating: game.catalogRating ?? null,
    catalogImage: game.catalogImage ?? null,
    catalogExpansions: game.catalogExpansions ?? [],
    expansions: (game.expansions ?? []).map((expansion) => expansion.name).join(", "),
  };
}

export default function Games() {
  const { stats, addGame, updateGame, deleteGame } = useAppData();
  const [sortConfig, setSortConfig] = useState({ key: "title", direction: "asc" });
  const games = sortGames(stats.gamesWithPlayCounts, sortConfig);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGameId, setEditingGameId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const catalogResults = getCatalogResults(catalogQuery, stats.gamesWithPlayCounts);

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function updateSort(key) {
    setSortConfig((currentSort) => ({
      key,
      direction:
        currentSort.key === key && currentSort.direction === "asc" ? "desc" : "asc",
    }));
  }

  function openCreateForm() {
    setEditingGameId(null);
    setForm(initialForm);
    setCatalogQuery("");
    setFormMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(game) {
    setEditingGameId(game.id);
    setForm(getGameForm(game));
    setCatalogQuery("");
    setFormMessage("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingGameId(null);
    setForm(initialForm);
    setCatalogQuery("");
    setFormMessage("");
    setIsFormOpen(false);
  }

  function applyCatalogEntry(entry) {
    setForm({
      ...initialForm,
      title: entry.name,
      category: "Katalogspiel",
      minPlayers: String(entry.minPlayers ?? 1),
      maxPlayers: String(entry.maxPlayers ?? entry.minPlayers ?? 1),
      duration: String(entry.maxPlayTime ?? entry.minPlayTime ?? 0),
      bggId: entry.bggId,
      catalogId: entry.id,
      catalogYear: entry.year,
      catalogRank: entry.rank,
      catalogRating: entry.rating,
      catalogImage: entry.image,
      catalogExpansions: entry.expansions ?? [],
      expansions: (entry.expansions ?? []).map((expansion) => expansion.name).join(", "),
    });
    setFormMessage(`Katalogdaten für "${entry.name}" übernommen. Bitte prüfen und speichern.`);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    if (editingGameId) {
      updateGame(editingGameId, form);
    } else {
      const wasAdded = addGame(form);

      if (!wasAdded) {
        setFormMessage("Dieses Spiel existiert bereits in deiner Sammlung.");
        return;
      }
    }

    closeForm();
  }

  function handleDelete(game) {
    const confirmed = window.confirm(
      `Spiel "${game.title}" löschen? Zugehörige Partien werden ebenfalls gelöscht.`,
    );

    if (confirmed) {
      deleteGame(game.id);
    }
  }

  return (
    <section className="page">
      <div className="page-heading row-heading">
        <div>
          <p className="eyebrow">Sammlung</p>
          <h1>Deine Spiele.</h1>
        </div>
        <button className="button" type="button" onClick={openCreateForm}>
          Spiel hinzufügen
        </button>
      </div>

      {isFormOpen && (
        <form className="entry-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <div>
              <p className="eyebrow">{editingGameId ? "Spiel bearbeiten" : "Neues Spiel"}</p>
              <h2>
                {editingGameId
                  ? "Spielinformationen aktualisieren."
                  : "Spiel zur Sammlung hinzufügen."}
              </h2>
            </div>
            <button className="ghost-button" type="button" onClick={closeForm}>
              Abbrechen
            </button>
          </div>
          {!editingGameId && (
            <section className="catalog-search">
              <div>
                <p className="eyebrow">Spielekatalog</p>
                <h3>Erst im Katalog suchen.</h3>
                <p>
                  Der Katalog ist getrennt von deiner Sammlung. Beim Übernehmen wird daraus
                  ein persönliches Spiel angelegt.
                </p>
              </div>
              <Field label="Katalog durchsuchen">
                <input
                  value={catalogQuery}
                  onChange={(event) => setCatalogQuery(event.target.value)}
                  placeholder="z. B. Ark Nova, Brass, Dune"
                />
              </Field>
              {catalogQuery.trim() && (
                <div className="catalog-results">
                  {catalogResults.map((entry) => (
                    <article className="catalog-result" key={entry.id}>
                      <div>
                        <strong>{entry.name}</strong>
                        <span>
                          {entry.year ?? "o. J."} · {entry.minPlayers}–{entry.maxPlayers} Spieler ·{" "}
                          {entry.playingTime}
                          {entry.isOwned ? " · bereits in Sammlung" : ""}
                        </span>
                      </div>
                      <button
                        className="button button-secondary"
                        type="button"
                        disabled={entry.isOwned}
                        onClick={() => applyCatalogEntry(entry)}
                      >
                        Übernehmen
                      </button>
                    </article>
                  ))}
                  {catalogResults.length === 0 && (
                    <p className="empty-hint">Kein Katalogtreffer. Du kannst manuell anlegen.</p>
                  )}
                </div>
              )}
            </section>
          )}
          {formMessage && <p className="form-message">{formMessage}</p>}
          <div className="form-grid">
            <Field label="Titel">
              <input
                required
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="z. B. Heat"
              />
            </Field>
            <Field label="Kategorie">
              <input
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
                placeholder="Kennerspiel"
              />
            </Field>
            <Field label="Min. Spieler">
              <input
                min="1"
                type="number"
                value={form.minPlayers}
                onChange={(event) => updateField("minPlayers", event.target.value)}
                placeholder="1"
              />
            </Field>
            <Field label="Max. Spieler">
              <input
                min={form.minPlayers || 1}
                type="number"
                value={form.maxPlayers}
                onChange={(event) => updateField("maxPlayers", event.target.value)}
                placeholder="4"
              />
            </Field>
            <Field label="Vorgegebene Spielzeit in Minuten">
              <input
                min="0"
                type="number"
                value={form.duration}
                onChange={(event) => updateField("duration", event.target.value)}
                placeholder="60"
              />
            </Field>
            <Field label="Erweiterungen optional">
              <textarea
                value={form.expansions}
                onChange={(event) => updateField("expansions", event.target.value)}
                placeholder="Eine Erweiterung pro Zeile oder mit Komma trennen"
              />
            </Field>
          </div>
          <button className="button" type="submit">
            {editingGameId ? "Änderungen speichern" : "Spiel speichern"}
          </button>
        </form>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              {sortableColumns.map((column) => (
                <th key={column.key}>
                  <button
                    className="sort-button"
                    type="button"
                    onClick={() => updateSort(column.key)}
                    aria-sort={
                      sortConfig.key === column.key
                        ? sortConfig.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    {column.label}
                    <span>
                      {sortConfig.key === column.key
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                </th>
              ))}
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id}>
                <td>
                  <strong>
                    <GameLink gameId={game.id}>{game.title}</GameLink>
                  </strong>
                </td>
                <td>{game.category}</td>
                <td>{game.catalogYear ?? "–"}</td>
                <td>{game.minPlayers}</td>
                <td>{game.maxPlayers}</td>
                <td>{game.duration} Min.</td>
                <td>{game.averagePlayedDuration ? `${game.averagePlayedDuration} Min.` : "–"}</td>
                <td>{game.expansions?.length ? game.expansions.length : "–"}</td>
                <td>{game.plays}</td>
                <td>
                  <div className="table-actions">
                    <button className="ghost-button" type="button" onClick={() => openEditForm(game)}>
                      Bearbeiten
                    </button>
                    <button
                      className="ghost-button danger-action"
                      type="button"
                      onClick={() => handleDelete(game)}
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function sortGames(games, sortConfig) {
  const column = sortableColumns.find((entry) => entry.key === sortConfig.key);
  const directionFactor = sortConfig.direction === "asc" ? 1 : -1;

  return [...games].toSorted((firstGame, secondGame) => {
    const firstValue = firstGame[sortConfig.key] ?? "";
    const secondValue = secondGame[sortConfig.key] ?? "";

    if (column?.type === "number") {
      return (Number(firstValue) - Number(secondValue)) * directionFactor;
    }

    return String(firstValue).localeCompare(String(secondValue), "de") * directionFactor;
  });
}

function getCatalogResults(query, existingGames) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return gameCatalog
    .filter((entry) => {
      const searchableText = [
        entry.name,
        entry.aliases?.join(" "),
        entry.year,
        entry.bggId,
        entry.expansions?.map((expansion) => expansion.name).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    })
    .slice(0, 12)
    .map((entry) => ({
      ...entry,
      isOwned: existingGames.some(
        (game) =>
          (entry.bggId && game.bggId === entry.bggId) ||
          game.title.trim().toLowerCase() === entry.name.trim().toLowerCase(),
      ),
    }));
}
