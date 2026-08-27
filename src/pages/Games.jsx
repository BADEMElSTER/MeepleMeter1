import { useRef, useState } from "react";
import Field from "../components/Field.jsx";
import GameLink from "../components/GameLink.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

const initialForm = {
  title: "",
  category: "",
  owner: "",
  minPlayers: "1",
  maxPlayers: "4",
  duration: "",
  bggId: null,
  catalogId: null,
  catalogOriginalTitle: null,
  catalogYear: "",
  catalogRank: null,
  catalogRating: null,
  catalogImage: null,
  catalogExpansions: [],
  germanTitle: "",
  expansions: "",
  defaultScoringMode: "high",
  scoreCategories: [],
  isRoundGame: false,
  roundScoringMode: "plus",
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
    catalogOriginalTitle: game.catalogOriginalTitle ?? null,
    catalogYear: game.catalogYear ? String(game.catalogYear) : "",
    catalogRank: game.catalogRank ?? null,
    catalogRating: game.catalogRating ?? null,
    catalogImage: game.catalogImage ?? null,
    catalogExpansions: game.catalogExpansions ?? [],
    germanTitle: game.germanTitle ?? "",
    expansions: (game.expansions ?? []).map((expansion) => expansion.name).join(", "),
    defaultScoringMode: game.defaultScoringMode ?? "high",
    scoreCategories: game.scoreCategories ?? [],
    isRoundGame: Boolean(game.isRoundGame),
    roundScoringMode: game.roundScoringMode ?? "plus",
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
  const { user, userProfile } = useAuth();
  const { stats, playerProfiles, gameCatalog, addGame, updateGame, deleteGame } = useAppData();
  const username = getCurrentPlayerName(user, userProfile, playerProfiles);
  const normalizedUsername = normalizeName(username);
  const [sortConfig, setSortConfig] = useState({ key: "title", direction: "asc" });
  const allGames = sortGames(stats.gamesWithPlayCounts, sortConfig);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGameId, setEditingGameId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [collectionQuery, setCollectionQuery] = useState("");
  const [gameScope, setGameScope] = useState("all");
  const [isScoringEditorOpen, setIsScoringEditorOpen] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const formRef = useRef(null);
  const ownDataRef = useRef(null);
  const titleInputRef = useRef(null);
  const catalogResults = getCatalogResults(catalogQuery, stats.gamesWithPlayCounts, gameCatalog);
  const scopedGames = filterGamesByScope(allGames, gameScope, normalizedUsername);
  const games = filterGames(scopedGames, collectionQuery);
  const categorySelectValue = commonCategories.includes(form.category)
    ? form.category
    : customCategoryValue;
  const editingGame = editingGameId ? allGames.find((game) => game.id === editingGameId) : null;
  const isEditingUnassignedGame = Boolean(editingGame && !getGameOwner(editingGame));

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
    setIsScoringEditorOpen(false);
    setFormMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(game) {
    if (!canEditGame(game, normalizedUsername)) {
      setFormMessage("Du kannst nur eigene oder nicht zugeordnete Spiele bearbeiten.");
      return;
    }

    setEditingGameId(game.id);
    setForm(getGameForm(game));
    setCatalogQuery("");
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
    setIsScoringEditorOpen(false);
    setFormMessage("");
    setIsFormOpen(false);
  }

  function applyCatalogEntry(entry) {
    const displayTitle = getCatalogDisplayTitle(entry);

    setForm({
      ...initialForm,
      title: displayTitle,
      category: "Katalogspiel",
      owner: username,
      minPlayers: String(entry.minPlayers ?? 1),
      maxPlayers: String(entry.maxPlayers ?? entry.minPlayers ?? 1),
      duration: String(entry.maxPlayTime ?? entry.minPlayTime ?? 0),
      bggId: entry.bggId,
      catalogId: entry.id,
      catalogOriginalTitle: entry.name,
      catalogYear: entry.year ? String(entry.year) : "",
      catalogRank: entry.rank,
      catalogRating: entry.rating,
      catalogImage: entry.image,
      catalogExpansions: entry.expansions ?? [],
      germanTitle: entry.germanTitle ?? "",
      expansions: (entry.expansions ?? []).map((expansion) => expansion.name).join(", "),
      defaultScoringMode: "high",
      scoreCategories: [],
      isRoundGame: false,
      roundScoringMode: "plus",
    });
    setCatalogQuery("");
    window.setTimeout(() => {
      ownDataRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      titleInputRef.current?.focus({ preventScroll: true });
    }, 0);
    setFormMessage(`Katalogdaten für "${displayTitle}" übernommen. Bitte prüfen und speichern.`);
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

    if (!form.owner.trim() && !isEditingUnassignedGame) {
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
    if (!canDeleteGame(game, normalizedUsername)) {
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
            <section className="catalog-search catalog-search-minimal">
              <div className="catalog-search-row">
                <input
                  value={catalogQuery}
                  onChange={(event) => setCatalogQuery(event.target.value)}
                  placeholder="Spiel suchen"
                  aria-label="Spiel im Katalog suchen"
                />
                <span
                  className="info-icon"
                  title="Aus dem Katalog übernommene Spiele werden als persönliches Spiel in deiner Sammlung angelegt."
                  aria-label="Aus dem Katalog übernommene Spiele werden als persönliches Spiel in deiner Sammlung angelegt."
                  role="img"
                >
                  i
                </span>
              </div>
              {catalogQuery.trim() && (
                <div className="catalog-results">
                  {catalogResults.map((entry) => (
                    <article className="catalog-result" key={entry.id}>
                      <div>
                        <strong>{getCatalogDisplayTitle(entry)}</strong>
                        <span>
                          {entry.germanTitle ? `${entry.name} · ` : ""}
                          {entry.year ?? "o. J."} · {entry.minPlayers}-{entry.maxPlayers} Spieler ·{" "}
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
                required={!isEditingUnassignedGame}
                readOnly={!isEditingUnassignedGame}
                value={form.owner}
                onChange={(event) => updateField("owner", event.target.value)}
                placeholder={isEditingUnassignedGame ? "Leer lassen oder deinen Benutzernamen eintragen" : "Benutzername"}
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
            <Field label="Standard-Wertung">
              <select
                value={form.defaultScoringMode}
                onChange={(event) => updateField("defaultScoringMode", event.target.value)}
              >
                <option value="high">Höchste Punktzahl gewinnt</option>
                <option value="low">Niedrigste Punktzahl gewinnt</option>
                <option value="placement">Platzierung eingeben</option>
                <option value="none">Keine Punkte</option>
              </select>
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
                  Kategorien, Plus-/Minuspunkte und Multiplikatoren für dieses Spiel.
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
                <div className="round-game-options">
                  <label className="checkbox-field">
                    <input
                      checked={Boolean(form.isRoundGame)}
                      type="checkbox"
                      onChange={(event) => updateField("isRoundGame", event.target.checked)}
                    />
                    Rundenspiel aktivieren
                  </label>
                  {form.isRoundGame && (
                    <Field label="Rundenwertung">
                      <select
                        value={form.roundScoringMode}
                        onChange={(event) => updateField("roundScoringMode", event.target.value)}
                      >
                        <option value="plus">Rundenpunkte addieren</option>
                        <option value="minus">Minuspunkte je Runde addieren</option>
                      </select>
                    </Field>
                  )}
                </div>
                {!form.isRoundGame && (
                  <>
                    <div className="score-category-toolbar">
                      <button className="button button-secondary" type="button" onClick={addScoreCategory}>
                        Kategorie hinzufügen
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
                              placeholder="z. B. Städte, Karten, Münzen"
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
              </>
            )}
          </section>
          <button className="button" type="submit">
            {editingGameId ? "Änderungen speichern" : "Spiel speichern"}
          </button>
        </form>
      )}

      <div className="collection-search">
        <div className="play-scope-tabs collection-scope-tabs" aria-label="Sammlung filtern">
          <button
            className={gameScope === "all" ? "active" : ""}
            type="button"
            onClick={() => setGameScope("all")}
          >
            Alle Spiele
          </button>
          <button
            className={gameScope === "mine" ? "active" : ""}
            type="button"
            onClick={() => setGameScope("mine")}
          >
            Eigene Spiele
          </button>
        </div>
        <input
          value={collectionQuery}
          onChange={(event) => setCollectionQuery(event.target.value)}
          placeholder="Spiel suchen"
          aria-label="Sammlung nach Spiel durchsuchen"
        />
      </div>

      <div className="table-card collection-table-card">
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
                  <strong className="desktop-game-title">
                    <GameLink gameId={game.id}>{game.title}</GameLink>
                  </strong>
                  <div className="mobile-game-summary">
                    <div className="mobile-game-summary-top">
                      <strong>
                        <GameLink gameId={game.id}>{game.title}</GameLink>
                      </strong>
                      <span className="mobile-game-owner">{game.owner || "Nicht zugeordnet"}</span>
                      <GameActions
                        game={game}
                        normalizedUsername={normalizedUsername}
                        onDelete={handleDelete}
                        onEdit={openEditForm}
                      />
                    </div>
                    <div className="mobile-game-summary-meta">
                      <span>{game.category}</span>
                      <span>{game.catalogYear ?? "-"}</span>
                      <span>{game.minPlayers}-{game.maxPlayers} Spieler</span>
                      <span>{game.duration} Min.</span>
                      <span>{game.plays} Partien</span>
                    </div>
                  </div>
                </td>
                <td>{game.category}</td>
                <td>{game.owner || "Nicht zugeordnet"}</td>
                <td>{game.catalogYear ?? "-"}</td>
                <td>{game.minPlayers}</td>
                <td>{game.maxPlayers}</td>
                <td>
                  <div className="time-cell">
                    <span>{game.duration} Min. geplant</span>
                    <span>{game.averagePlayedDuration ? `${game.averagePlayedDuration} Min. Ø echt` : "- Ø echt"}</span>
                  </div>
                </td>
                <td>{game.expansions?.length ? game.expansions.length : "-"}</td>
                <td>{game.plays}</td>
                <td>
                  <GameActions
                    game={game}
                    normalizedUsername={normalizedUsername}
                    onDelete={handleDelete}
                    onEdit={openEditForm}
                  />
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

function GameActions({ game, normalizedUsername, onDelete, onEdit }) {
  const canEdit = canEditGame(game, normalizedUsername);
  const canDelete = canDeleteGame(game, normalizedUsername);

  if (!canEdit && !canDelete) {
    return null;
  }

  return (
    <div className="table-actions compact-actions">
      {canEdit && (
        <>
          <a
            aria-label={`Punktewertung für ${game.title} bearbeiten`}
            className="icon-action scoring-action"
            href={`/games/${game.id}/scoring`}
            title="Punktewertung"
          >
            <span aria-hidden="true">S</span>
          </a>
          <button
            aria-label={`${game.title} bearbeiten`}
            className="icon-action edit-action"
            title="Bearbeiten"
            type="button"
            onClick={() => onEdit(game)}
          >
            <span aria-hidden="true" className="icon-pencil" />
          </button>
        </>
      )}
      {canDelete && (
        <button
          aria-label={`${game.title} löschen`}
          className="icon-action delete-action"
          title="Löschen"
          type="button"
          onClick={() => onDelete(game)}
        >
          <span aria-hidden="true" className="icon-cross" />
        </button>
      )}
    </div>
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

function filterGames(games, query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return games;
  }

  return games.filter((game) =>
    [
      game.title,
      game.category,
      game.owner,
      game.catalogYear,
      ...(game.expansions ?? []),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
  );
}

function filterGamesByScope(games, scope, normalizedUsername) {
  if (scope !== "mine") {
    return games;
  }

  return games.filter(
    (game) => normalizeName(game.ownerNormalized || game.owner) === normalizedUsername,
  );
}

function getGameOwner(game) {
  return game?.ownerNormalized || game?.owner?.trim().toLowerCase() || "";
}

function getCurrentPlayerName(user, userProfile, playerProfiles) {
  const profileName = userProfile?.username || userProfile?.displayName;

  if (profileName?.trim()) {
    return profileName.trim();
  }

  const userEmail = user?.email?.trim().toLowerCase();

  if (!userEmail) {
    return "";
  }

  const matchingPlayerProfile = playerProfiles.find((profile) => {
    const profileEmail = profile.accountEmail?.trim().toLowerCase();
    const profileUsername = profile.accountUsername?.trim().toLowerCase();

    return profileEmail === userEmail || profileUsername === userEmail;
  });

  return matchingPlayerProfile?.name ?? "";
}

function normalizeName(name) {
  return String(name ?? "").trim().toLowerCase();
}

function canEditGame(game, normalizedUsername) {
  if (!normalizedUsername) {
    return false;
  }

  const owner = getGameOwner(game);
  return !owner || owner === normalizedUsername;
}

function canDeleteGame(game, normalizedUsername) {
  if (!normalizedUsername) {
    return false;
  }

  const owner = getGameOwner(game);
  return owner === normalizedUsername;
}

function getCatalogResults(query, existingGames, gameCatalog) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return gameCatalog
    .filter((entry) => {
      const searchableText = [
        entry.name,
        entry.germanTitle,
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
          game.title.trim().toLowerCase() === getCatalogDisplayTitle(entry).trim().toLowerCase() ||
          game.title.trim().toLowerCase() === entry.name.trim().toLowerCase(),
      ),
    }));
}

function getCatalogDisplayTitle(entry) {
  return entry.germanTitle?.trim() || entry.name;
}

