import { useRef, useState } from "react";
import Field from "../components/Field.jsx";
import GameLink from "../components/GameLink.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useAppData } from "../data/AppDataContext.jsx";
import { gameCatalog } from "../data/gameCatalog.js";

const initialForm = {
  title: "",
  category: "",
  owner: "",
  minPlayers: "1",
  maxPlayers: "4",
  duration: "",
  bggId: null,
  catalogId: null,
  catalogYear: "",
  catalogRank: null,
  catalogRating: null,
  catalogImage: null,
  catalogExpansions: [],
  expansions: "",
  scoreCategories: [],
};

const sortableColumns = [
  { key: "title", label: "Spiel", type: "text" },
  { key: "category", label: "Kategorie", type: "text" },
  { key: "owner", label: "Eigentümer", type: "text" },
  { key: "catalogYear", label: "Jahr", type: "number" },
  { key: "minPlayers", label: "Min.", type: "number" },
  { key: "maxPlayers", label: "Max.", type: "number" },
  { key: "expansionCount", label: "Erweiterungen", type: "number" },
  { key: "plays", label: "Partien", type: "number" },
];

const commonCategories = [
  "Familienspiel",
  "Kennerspiel",
  "Expertenspiel",
  "Partyspiel",
  "Kinderspiel",
  "Kartenspiel",
  "Würfelspiel",
  "Kooperativ",
  "Deduktion",
  "Deckbuilding",
  "Worker Placement",
  "Push-your-luck",
  "Strategiespiel",
  "Absacker",
  "Computer",
];

const customCategoryValue = "__custom__";

function getGameForm(game) {
  return {
    title: game.title,
    category: game.category,
    owner: game.owner ?? "",
    minPlayers: String(game.minPlayers),
    maxPlayers: String(game.maxPlayers),
    duration: String(game.duration),
    bggId: game.bggId ?? null,
    catalogId: game.catalogId ?? null,
    catalogYear: game.catalogYear ? String(game.catalogYear) : "",
    catalogRank: game.catalogRank ?? null,
    catalogRating: game.catalogRating ?? null,
    catalogImage: game.catalogImage ?? null,
    catalogExpansions: game.catalogExpansions ?? [],
    expansions: (game.expansions ?? []).map((expansion) => expansion.name).join(", "),
    scoreCategories: game.scoreCategories ?? [],
  };
}

function createScoreCategory() {
  return {
    id: crypto.randomUUID?.() ?? `category-${Date.now()}`,
    name: "",
    type: "plus",
    multiplier: 1,
  };
}

export default function Games() {
  const { userProfile } = useAuth();
  const { stats, addGame, updateGame, deleteGame } = useAppData();
  const username = userProfile?.username || userProfile?.displayName || "";
  const normalizedUsername = username.trim().toLowerCase();
  const [sortConfig, setSortConfig] = useState({ key: "title", direction: "asc" });
  const games = sortGames(stats.gamesWithPlayCounts, sortConfig);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGameId, setEditingGameId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [isCatalogSearchOpen, setIsCatalogSearchOpen] = useState(true);
  const [isScoringEditorOpen, setIsScoringEditorOpen] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const formRef = useRef(null);
  const ownDataRef = useRef(null);
  const titleInputRef = useRef(null);
  const catalogResults = getCatalogResults(catalogQuery, stats.gamesWithPlayCounts);
  const categorySelectValue = commonCategories.includes(form.category)
    ? form.category
    : customCategoryValue;

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
    setForm({ ...initialForm, owner: username });
    setCatalogQuery("");
    setIsCatalogSearchOpen(true);
    setIsScoringEditorOpen(false);
    setFormMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(game) {
    if (!canManageGame(game, normalizedUsername)) {
      setFormMessage("Du kannst nur eigene Spiele bearbeiten.");
      return;
    }

    setEditingGameId(game.id);
    setForm(getGameForm(game));
    setCatalogQuery("");
    setIsCatalogSearchOpen(false);
    setIsScoringEditorOpen(Boolean(game.scoreCategories?.length));
    setFormMessage("");
    setIsFormOpen(true);
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      titleInputRef.current?.focus({ preventScroll: true });
    }, 0);
  }

  function closeForm() {
    setEditingGameId(null);
    setForm({ ...initialForm, owner: username });
    setCatalogQuery("");
    setIsCatalogSearchOpen(true);
    setIsScoringEditorOpen(false);
    setFormMessage("");
    setIsFormOpen(false);
  }

  function applyCatalogEntry(entry) {
    setForm({
      ...initialForm,
      title: entry.name,
      category: "Katalogspiel",
      owner: username,
      minPlayers: String(entry.minPlayers ?? 1),
      maxPlayers: String(entry.maxPlayers ?? entry.minPlayers ?? 1),
      duration: String(entry.maxPlayTime ?? entry.minPlayTime ?? 0),
      bggId: entry.bggId,
      catalogId: entry.id,
      catalogYear: entry.year ? String(entry.year) : "",
      catalogRank: entry.rank,
      catalogRating: entry.rating,
      catalogImage: entry.image,
      catalogExpansions: entry.expansions ?? [],
      expansions: (entry.expansions ?? []).map((expansion) => expansion.name).join(", "),
      scoreCategories: [],
    });
    setCatalogQuery("");
    setIsCatalogSearchOpen(false);
    window.setTimeout(() => {
      ownDataRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      titleInputRef.current?.focus({ preventScroll: true });
    }, 0);
    setFormMessage(`Katalogdaten für "${entry.name}" übernommen. Bitte prüfen und speichern.`);
  }

  function updateCategorySelection(value) {
    if (value === customCategoryValue) {
      setForm((currentForm) => ({
        ...currentForm,
        category: commonCategories.includes(currentForm.category) ? "" : currentForm.category,
      }));
      return;
    }

    updateField("category", value);
  }

  function openScoringEditor() {
    setIsScoringEditorOpen(true);
    setForm((currentForm) => ({
      ...currentForm,
      scoreCategories: currentForm.scoreCategories?.length
        ? currentForm.scoreCategories
        : [createScoreCategory()],
    }));
  }

  function addScoreCategory() {
    setForm((currentForm) => ({
      ...currentForm,
      scoreCategories: [...(currentForm.scoreCategories ?? []), createScoreCategory()],
    }));
  }

  function updateScoreCategory(categoryId, field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      scoreCategories: (currentForm.scoreCategories ?? []).map((category) =>
        category.id === categoryId ? { ...category, [field]: value } : category,
      ),
    }));
  }

  function removeScoreCategory(categoryId) {
    setForm((currentForm) => ({
      ...currentForm,
      scoreCategories:
        (currentForm.scoreCategories ?? []).length === 1
          ? [createScoreCategory()]
          : (currentForm.scoreCategories ?? []).filter((category) => category.id !== categoryId),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    if (!form.owner.trim()) {
      setFormMessage("Bitte trage einen Eigentümer ein.");
      return;
    }

    if (normalizedUsername && form.owner.trim().toLowerCase() !== normalizedUsername) {
      setFormMessage("Der Eigentümer muss deinem Benutzernamen entsprechen.");
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
    if (!canManageGame(game, normalizedUsername)) {
      setFormMessage("Du kannst nur eigene Spiele löschen.");
      return;
    }

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
        <form className="entry-form" ref={formRef} onSubmit={handleSubmit}>
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
            <section
              className={`catalog-search ${
                isCatalogSearchOpen ? "" : "catalog-search-collapsed"
              }`}
            >
              <div className="catalog-search-header">
                <div>
                  <p className="eyebrow">Spielekatalog</p>
                  <h3>Erst im Katalog suchen.</h3>
                  <p>
                    Der Katalog ist getrennt von deiner Sammlung. Beim Übernehmen wird daraus
                    ein persönliches Spiel angelegt.
                  </p>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setIsCatalogSearchOpen((currentValue) => !currentValue)}
                >
                  {isCatalogSearchOpen ? "Minimieren" : "Katalog öffnen"}
                </button>
              </div>
              {isCatalogSearchOpen && (
                <>
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
                </>
              )}
            </section>
          )}
          {formMessage && <p className="form-message">{formMessage}</p>}
          <div className="form-grid" ref={ownDataRef}>
            <Field label="Titel">
              <input
                ref={titleInputRef}
                required
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="z. B. Heat"
              />
            </Field>
            <Field label="Eigentümer">
              <input
                required
                readOnly
                value={form.owner}
                onChange={(event) => updateField("owner", event.target.value)}
                placeholder="Benutzername"
              />
            </Field>
            <Field label="Kategorie">
              <select
                value={categorySelectValue}
                onChange={(event) => updateCategorySelection(event.target.value)}
              >
                {commonCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                <option value={customCategoryValue}>Eigene Kategorie anlegen</option>
              </select>
            </Field>
            {categorySelectValue === customCategoryValue && (
              <Field label="Eigene Kategorie">
                <input
                  value={form.category}
                  onChange={(event) => updateField("category", event.target.value)}
                  placeholder="z. B. Roll & Write"
                />
              </Field>
            )}
            <Field label="Jahr">
              <input
                min="1900"
                max="2100"
                type="number"
                value={form.catalogYear}
                onChange={(event) => updateField("catalogYear", event.target.value)}
                placeholder="z. B. 2021"
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

          <section className={`inline-scoring-panel ${isScoringEditorOpen ? "is-open" : ""}`}>
            <div className="form-header">
              <div>
                <p className="eyebrow">Punktewertung</p>
                <h3>Optionale Detailwertung anlegen.</h3>
                <p className="scoring-panel-hint">
                  Kategorien, Plus-/Minuspunkte und Multiplikatoren f\u00fcr dieses Spiel.
                </p>
              </div>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => (isScoringEditorOpen ? setIsScoringEditorOpen(false) : openScoringEditor())}
              >
                {isScoringEditorOpen ? "Punktewertung einklappen" : "Punktewertung anlegen"}
              </button>
            </div>

            {isScoringEditorOpen && (
              <>
                <div className="score-category-toolbar">
                  <button className="button button-secondary" type="button" onClick={addScoreCategory}>
                    Kategorie hinzuf\u00fcgen
                  </button>
                </div>
                <div className="score-category-list">
                  {(form.scoreCategories ?? []).map((category) => (
                    <div className="score-category-row" key={category.id}>
                      <Field label="Kategorie">
                        <input
                          value={category.name}
                          onChange={(event) =>
                            updateScoreCategory(category.id, "name", event.target.value)
                          }
                          placeholder="z. B. St\u00e4dte, Karten, M\u00fcnzen"
                        />
                      </Field>
                      <Field label="Wertung">
                        <select
                          value={category.type}
                          onChange={(event) =>
                            updateScoreCategory(category.id, "type", event.target.value)
                          }
                        >
                          <option value="plus">Pluspunkte</option>
                          <option value="minus">Minuspunkte</option>
                        </select>
                      </Field>
                      <Field label="Multiplikator">
                        <input
                          min="0"
                          step="0.5"
                          type="number"
                          value={category.multiplier}
                          onChange={(event) =>
                            updateScoreCategory(category.id, "multiplier", event.target.value)
                          }
                        />
                      </Field>
                      <button
                        className="ghost-button danger-action score-category-delete"
                        type="button"
                        onClick={() => removeScoreCategory(category.id)}
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
          <button className="button" type="submit">
            {editingGameId ? "Änderungen speichern" : "Spiel speichern"}
          </button>
        </form>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              {sortableColumns.slice(0, 6).map((column) => (
                <th key={column.key}>
                  <SortButton column={column} sortConfig={sortConfig} onSort={updateSort} />
                </th>
              ))}
              <th>
                <div className="time-sort-group">
                  <span>Spielzeit</span>
                  <div>
                    <SortButton
                      column={{ key: "duration", label: "Plan", type: "number" }}
                      sortConfig={sortConfig}
                      onSort={updateSort}
                    />
                    <SortButton
                      column={{ key: "averagePlayedDuration", label: "Ø echt", type: "number" }}
                      sortConfig={sortConfig}
                      onSort={updateSort}
                    />
                  </div>
                </div>
              </th>
              {sortableColumns.slice(6).map((column) => (
                <th key={column.key}>
                  <SortButton column={column} sortConfig={sortConfig} onSort={updateSort} />
                </th>
              ))}
              <th className="actions-column">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id}>
                <td className="game-title-cell">
                  <strong>
                    <GameLink gameId={game.id}>{game.title}</GameLink>
                  </strong>
                </td>
                <td>{game.category}</td>
                <td>{game.owner || "Nicht zugeordnet"}</td>
                <td>{game.catalogYear ?? "–"}</td>
                <td>{game.minPlayers}</td>
                <td>{game.maxPlayers}</td>
                <td>
                  <div className="time-cell">
                    <span>{game.duration} Min. geplant</span>
                    <span>{game.averagePlayedDuration ? `${game.averagePlayedDuration} Min. Ø echt` : "– Ø echt"}</span>
                  </div>
                </td>
                <td>{game.expansions?.length ? game.expansions.length : "–"}</td>
                <td>{game.plays}</td>
                <td>
                  {canManageGame(game, normalizedUsername) ? (
                    <div className="table-actions compact-actions">
                      <a
                        aria-label={`Punktewertung für ${game.title} bearbeiten`}
                        className="icon-action scoring-action"
                        href={`/games/${game.id}/scoring`}
                        title="Punktewertung"
                      >
                        <span aria-hidden="true">Σ</span>
                      </a>
                      <button
                        aria-label={`${game.title} bearbeiten`}
                        className="icon-action edit-action"
                        title="Bearbeiten"
                        type="button"
                        onClick={() => openEditForm(game)}
                      >
                        <span aria-hidden="true" className="icon-pencil" />
                      </button>
                      <button
                        aria-label={`${game.title} löschen`}
                        className="icon-action delete-action"
                        title="Löschen"
                        type="button"
                        onClick={() => handleDelete(game)}
                      >
                        <span aria-hidden="true" className="icon-cross" />
                      </button>
                    </div>
                  ) : (
                    <span className="table-note">Nur Eigentümer</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SortButton({ column, sortConfig, onSort }) {
  const isActive = sortConfig.key === column.key;

  return (
    <button
      className="sort-button"
      type="button"
      onClick={() => onSort(column.key)}
      aria-sort={isActive ? (sortConfig.direction === "asc" ? "ascending" : "descending") : "none"}
    >
      {column.label}
      <span>{isActive ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

function sortGames(games, sortConfig) {
  const column = sortableColumns.find((entry) => entry.key === sortConfig.key);
  const directionFactor = sortConfig.direction === "asc" ? 1 : -1;

  return [...games].sort((firstGame, secondGame) => {
    const firstValue = firstGame[sortConfig.key] ?? "";
    const secondValue = secondGame[sortConfig.key] ?? "";

    if (column?.type === "number") {
      return (Number(firstValue) - Number(secondValue)) * directionFactor;
    }

    return String(firstValue).localeCompare(String(secondValue), "de") * directionFactor;
  });
}

function canManageGame(game, normalizedUsername) {
  if (!normalizedUsername) {
    return false;
  }

  const owner = game.ownerNormalized || game.owner?.trim().toLowerCase() || "";
  return owner === normalizedUsername;
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

