import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../data/AppDataContext.jsx";

const initialResetSelection = {
  resetGames: false,
  resetPlays: false,
  resetPlayers: false,
};

export default function Admin() {
  const { games, plays, gameCatalog, addGames, addPlays, addCatalogGames, resetLocalData } = useAppData();
  const [importMessage, setImportMessage] = useState("");
  const [importPreview, setImportPreview] = useState(null);
  const [playImportMessage, setPlayImportMessage] = useState("");
  const [playImportPreview, setPlayImportPreview] = useState(null);
  const [catalogImportMessage, setCatalogImportMessage] = useState("");
  const [catalogImportPreview, setCatalogImportPreview] = useState(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetSelection, setResetSelection] = useState(initialResetSelection);

  async function handleGameImport(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await readImportFileText(file);
      const importedGames = parseGameImport(text, file.name);
      const previewRows = buildImportPreview(importedGames, games);
      const importableCount = previewRows.filter((row) => row.status === "ready").length;

      setImportPreview({
        fileName: file.name,
        games: importedGames,
        rows: previewRows,
      });
      setImportMessage(`${importedGames.length} Spiele erkannt. ${importableCount} davon können importiert werden.`);
    } catch (error) {
      setImportPreview(null);
      setImportMessage(error.message);
    } finally {
      event.target.value = "";
    }
  }

  function confirmGameImport() {
    if (!importPreview) {
      return;
    }

    const gamesToImport = importPreview.rows
      .filter((row) => row.status === "ready")
      .map((row) => importPreview.games[row.index]);
    const addedCount = addGames(gamesToImport);

    setImportMessage(`${addedCount} von ${importPreview.games.length} Spielen importiert.`);
    setImportPreview(null);
  }

  function cancelGameImport() {
    setImportPreview(null);
    setImportMessage("");
  }

  async function handlePlayImport(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await readImportFileText(file);
      const importedPlays = parsePlayImport(text, file.name, games);
      const previewRows = buildPlayImportPreview(importedPlays, games);
      const importableCount = previewRows.filter((row) => row.status === "ready").length;

      setPlayImportPreview({
        fileName: file.name,
        plays: importedPlays,
        rows: previewRows,
      });
      setPlayImportMessage(
        `${importedPlays.length} Partien erkannt. ${importableCount} davon können importiert werden.`,
      );
    } catch (error) {
      setPlayImportPreview(null);
      setPlayImportMessage(error.message);
    } finally {
      event.target.value = "";
    }
  }

  function confirmPlayImport() {
    if (!playImportPreview) {
      return;
    }

    const playsToImport = playImportPreview.rows
      .filter((row) => row.status === "ready")
      .map((row) => playImportPreview.plays[row.index]);
    const addedCount = addPlays(playsToImport);

    setPlayImportMessage(`${addedCount} von ${playImportPreview.plays.length} Partien importiert.`);
    setPlayImportPreview(null);
  }

  function cancelPlayImport() {
    setPlayImportPreview(null);
    setPlayImportMessage("");
  }


  async function handleCatalogImport(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await readImportFileText(file);
      const importedCatalogGames = parseCatalogImport(text, file.name);
      const previewRows = buildCatalogImportPreview(importedCatalogGames, gameCatalog);
      const importableCount = previewRows.filter((row) => row.status === "ready").length;

      setCatalogImportPreview({
        fileName: file.name,
        games: importedCatalogGames,
        rows: previewRows,
      });
      setCatalogImportMessage(
        `${importedCatalogGames.length} Katalogspiele erkannt. ${importableCount} davon können importiert werden.`,
      );
    } catch (error) {
      setCatalogImportPreview(null);
      setCatalogImportMessage(error.message);
    } finally {
      event.target.value = "";
    }
  }

  async function confirmCatalogImport() {
    if (!catalogImportPreview) {
      return;
    }

    try {
      setCatalogImportMessage("Import läuft...");
      const gamesToImport = catalogImportPreview.rows
        .filter((row) => row.status === "ready")
        .map((row) => catalogImportPreview.games[row.index]);
      const addedCount = await addCatalogGames(gamesToImport);

      setCatalogImportMessage(
        `Import abgeschlossen: ${addedCount} von ${catalogImportPreview.games.length} Katalogspielen importiert.`,
      );
      setCatalogImportPreview(null);
    } catch (error) {
      setCatalogImportMessage(`Import fehlgeschlagen: ${error.message}`);
    }
  }

  function cancelCatalogImport() {
    setCatalogImportPreview(null);
    setCatalogImportMessage("");
  }

  function exportData(type, rows) {
    const content = JSON.stringify(rows, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meeplemeter-${type}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function openResetDialog() {
    setResetSelection(initialResetSelection);
    setIsResetDialogOpen(true);
  }

  function closeResetDialog() {
    setIsResetDialogOpen(false);
    setResetSelection(initialResetSelection);
  }

  function updateResetSelection(field) {
    setResetSelection((currentSelection) => ({
      ...currentSelection,
      [field]: !currentSelection[field],
    }));
  }

  function confirmReset() {
    resetLocalData(resetSelection);
    closeResetDialog();
  }

  const hasResetSelection = Object.values(resetSelection).some(Boolean);

  return (
    <section className="page">
      <div className="page-heading row-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Verwaltung.</h1>
          <p className="page-intro">
            Vorbereiteter Bereich für spätere Rollensteuerung. Aktuell lokal sichtbar.
          </p>
        </div>
      </div>

      <div className="panel-grid admin-grid">
        <article className="panel">
          <p className="eyebrow">Import</p>
          <h2>Daten hochladen</h2>
          <div className="admin-action-list">
            <div className="admin-action-row">
              <label className="file-upload">
                <input accept=".json,.csv,text/csv,application/json" type="file" onChange={handleGameImport} />
                Spieleliste auswählen
              </label>
              <InfoIcon text="Unterstützt JSON oder CSV mit title/name, category, year, minPlayers, maxPlayers und duration." />
            </div>
            <div className="admin-action-row">
              <label className="file-upload">
                <input accept=".json,.csv,text/csv,application/json" type="file" onChange={handlePlayImport} />
                Partienliste auswählen
              </label>
              <InfoIcon text="Unterstützt JSON oder CSV mit game/title, date, duration, scoringMode, participants und winner." />
            </div>
            <div className="admin-action-row">
              <label className="file-upload">
                <input accept=".json,.csv,text/csv,application/json" type="file" onChange={handleCatalogImport} />
                Spielekatalog auswählen
              </label>
              <InfoIcon text="Ergänzt den zentralen Spielekatalog. Unterstützt JSON oder CSV. Empfohlene Spalten: name/title, germanTitle/deutscherTitel, bggId, year, minPlayers, maxPlayers, minPlayTime, maxPlayTime, playingTime, rank, rating, image, expansions. Bestehende Sammlungen werden nicht verändert." />
            </div>
          </div>
          {importMessage && <p className="form-message">{importMessage}</p>}
          {importPreview && (
            <div className="import-preview">
              <div className="import-preview-header">
                <div>
                  <p className="eyebrow">Vorschau</p>
                  <h3>{importPreview.fileName}</h3>
                </div>
                <div className="admin-actions inline-actions">
                  <button className="button button-secondary" type="button" onClick={cancelGameImport}>
                    Abbrechen
                  </button>
                  <button className="button" type="button" onClick={confirmGameImport}>
                    Import bestätigen
                  </button>
                </div>
              </div>
              <div className="table-scroll">
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Spiel</th>
                      <th>Kategorie</th>
                      <th>Jahr</th>
                      <th>Spieler</th>
                      <th>Dauer</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.rows.map((row) => (
                      <tr key={`${row.index}-${row.title}`}>
                        <td>{row.title || "Ohne Titel"}</td>
                        <td>{row.category || "-"}</td>
                        <td>{row.catalogYear || "-"}</td>
                        <td>
                          {row.minPlayers}-{row.maxPlayers}
                        </td>
                        <td>{row.duration ? `${row.duration} Min.` : "-"}</td>
                        <td>
                          <span className={`status-pill ${row.status === "ready" ? "status-active" : "status-muted"}`}>
                            {row.message}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {playImportMessage && <p className="form-message">{playImportMessage}</p>}
          {playImportPreview && (
            <div className="import-preview">
              <div className="import-preview-header">
                <div>
                  <p className="eyebrow">Vorschau</p>
                  <h3>{playImportPreview.fileName}</h3>
                </div>
                <div className="admin-actions inline-actions">
                  <button className="button button-secondary" type="button" onClick={cancelPlayImport}>
                    Abbrechen
                  </button>
                  <button className="button" type="button" onClick={confirmPlayImport}>
                    Import bestätigen
                  </button>
                </div>
              </div>
              <div className="table-scroll">
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Spiel</th>
                      <th>Mitspieler</th>
                      <th>Gewinner</th>
                      <th>Dauer</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playImportPreview.rows.map((row) => (
                      <tr key={`${row.index}-${row.game}-${row.date}`}>
                        <td>{row.date || "-"}</td>
                        <td>{row.game || "Unbekannt"}</td>
                        <td>{row.participantCount}</td>
                        <td>{row.winner || "-"}</td>
                        <td>{row.duration ? `${row.duration} Min.` : "-"}</td>
                        <td>
                          <span className={`status-pill ${row.status === "ready" ? "status-active" : "status-muted"}`}>
                            {row.message}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {catalogImportMessage && <p className="form-message">{catalogImportMessage}</p>}
          {catalogImportPreview && (
            <div className="import-preview">
              <div className="import-preview-header">
                <div>
                  <p className="eyebrow">Vorschau</p>
                  <h3>{catalogImportPreview.fileName}</h3>
                </div>
                <div className="admin-actions inline-actions">
                  <button className="button button-secondary" type="button" onClick={cancelCatalogImport}>
                    Abbrechen
                  </button>
                  <button className="button" type="button" onClick={confirmCatalogImport}>
                    Import bestätigen
                  </button>
                </div>
              </div>
              <div className="table-scroll">
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Spiel</th>
                      <th>Deutsch</th>
                      <th>Jahr</th>
                      <th>Spieler</th>
                      <th>Spielzeit</th>
                      <th>BGG</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogImportPreview.rows.map((row) => (
                      <tr key={`${row.index}-${row.name}`}>
                        <td>{row.name || "Ohne Titel"}</td>
                        <td>{row.germanTitle || "-"}</td>
                        <td>{row.year || "-"}</td>
                        <td>{row.minPlayers}-{row.maxPlayers}</td>
                        <td>{row.playingTime || "-"}</td>
                        <td>{row.bggId || "-"}</td>
                        <td>
                          <span className={`status-pill ${row.status === "ready" ? "status-active" : "status-muted"}`}>
                            {row.message}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">Export</p>
          <h2>Daten herunterladen</h2>
          <div className="admin-actions">
            <button className="button button-secondary" type="button" onClick={() => exportData("spiele", games)}>
              Spiele herunterladen
            </button>
            <button className="button button-secondary" type="button" onClick={() => exportData("partien", plays)}>
              Partien und Ergebnisse herunterladen
            </button>
          </div>
        </article>
      </div>

      <div className="panel-grid admin-grid">
        <article className="panel admin-link-card admin-combined-card">
          <p className="eyebrow">Verwalten</p>
          <h2>Daten verwalten</h2>
          <div className="admin-action-list">
            <div className="admin-action-row">
              <Link className="button button-secondary" to="/admin/players">
                Mitspieler verwalten
              </Link>
              <InfoIcon text="Mitspieler suchen, Account-Status pflegen und spätere Benutzerkonten vorbereiten." />
            </div>
            <div className="admin-action-row">
              <Link className="button button-secondary" to="/admin/games">
                Spiele verwalten
              </Link>
              <InfoIcon text="Spieldaten, Spieleranzahl und Eigentümer bearbeiten oder ausgewählte Spiele löschen." />
            </div>
            <div className="admin-action-row">
              <Link className="button button-secondary" to="/admin/plays">
                Partien löschen
              </Link>
              <InfoIcon text="Partien nach Spiel, Gewinner und Datum filtern und ausgewählte Einträge löschen." />
            </div>
            <div className="admin-action-row">
              <Link className="button button-secondary" to="/admin/catalog">
                Spielekatalog verwalten
              </Link>
              <InfoIcon text="Katalogspiele suchen, einzelne Einträge bearbeiten oder aus dem Katalog löschen." />
            </div>
          </div>
        </article>
      </div>

      <article className="panel admin-danger-panel">
        <p className="eyebrow">Testphase</p>
        <h2>Testdaten zurücksetzen</h2>
        <p>
          Setzt nur die lokal gespeicherten MeepleMeter-Daten zurück. Firebase-Auth-Konten werden dadurch nicht gelöscht.
        </p>
        <button className="button button-danger" type="button" onClick={openResetDialog}>
          Alles zurücksetzen
        </button>
      </article>

      {isResetDialogOpen && (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title">
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Zurücksetzen</p>
                <h2 id="reset-dialog-title">Was soll gelöscht werden?</h2>
              </div>
              <button className="ghost-button" type="button" onClick={closeResetDialog}>
                Schließen
              </button>
            </div>

            <p className="dialog-warning">
              Diese Aktion löscht die ausgewählten lokalen Testdaten dauerhaft aus dem Browser-Speicher.
            </p>

            <div className="reset-options">
              <label>
                <input
                  type="checkbox"
                  checked={resetSelection.resetGames}
                  onChange={() => updateResetSelection("resetGames")}
                />
                Sammlung zurücksetzen
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={resetSelection.resetPlays}
                  onChange={() => updateResetSelection("resetPlays")}
                />
                Partien zurücksetzen
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={resetSelection.resetPlayers}
                  onChange={() => updateResetSelection("resetPlayers")}
                />
                Benutzer zurücksetzen
              </label>
            </div>

            <div className="dialog-actions">
              <button className="button button-secondary" type="button" onClick={closeResetDialog}>
                Abbrechen
              </button>
              <button
                className="button button-danger"
                type="button"
                disabled={!hasResetSelection}
                onClick={confirmReset}
              >
                Auswahl zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function InfoIcon({ text }) {
  return (
    <span className="info-icon admin-info-icon" title={text} aria-label={text} role="img">
      i
    </span>
  );
}

async function readImportFileText(file) {
  const buffer = await file.arrayBuffer();
  const utf8Text = decodeText(buffer, "utf-8");
  const windowsText = decodeText(buffer, "windows-1252");

  if (!utf8Text) {
    return windowsText;
  }

  if (!windowsText) {
    return utf8Text;
  }

  return countReplacementCharacters(windowsText) < countReplacementCharacters(utf8Text)
    ? windowsText
    : utf8Text;
}

function decodeText(buffer, encoding) {
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return "";
  }
}

function countReplacementCharacters(text) {
  return (text.match(/\uFFFD/g) ?? []).length;
}

function parseGameImport(text, fileName) {
  if (fileName.toLowerCase().endsWith(".json")) {
    const parsedData = JSON.parse(text);
    const games = Array.isArray(parsedData) ? parsedData : parsedData.games;

    if (!Array.isArray(games)) {
      throw new Error("JSON muss eine Liste oder ein Objekt mit games-Liste enthalten.");
    }

    return games.map(normalizeImportedGame).filter((game) => game.title);
  }

  return parseCsvGames(text).map(normalizeImportedGame).filter((game) => game.title);
}

function buildImportPreview(importedGames, existingGames) {
  const existingTitles = new Set(existingGames.map((game) => normalizeComparableTitle(game.title)));
  const existingBggIds = new Set(existingGames.map((game) => game.bggId).filter(Boolean));
  const importTitles = new Set();
  const importBggIds = new Set();

  return importedGames.map((game, index) => {
    const normalizedTitle = normalizeComparableTitle(game.title);
    const hasExistingTitle = existingTitles.has(normalizedTitle);
    const hasExistingBggId = game.bggId && existingBggIds.has(game.bggId);
    const hasImportTitle = importTitles.has(normalizedTitle);
    const hasImportBggId = game.bggId && importBggIds.has(game.bggId);
    let status = "ready";
    let message = "Wird importiert";

    if (!normalizedTitle) {
      status = "skipped";
      message = "Kein Titel";
    } else if (hasExistingTitle || hasExistingBggId) {
      status = "skipped";
      message = "Bereits vorhanden";
    } else if (hasImportTitle || hasImportBggId) {
      status = "skipped";
      message = "Doppelt in Datei";
    }

    if (normalizedTitle) {
      importTitles.add(normalizedTitle);
    }

    if (game.bggId) {
      importBggIds.add(game.bggId);
    }

    return {
      index,
      status,
      message,
      ...game,
    };
  });
}

function parsePlayImport(text, fileName, games) {
  const rows = fileName.toLowerCase().endsWith(".json")
    ? parseJsonRows(text, "plays")
    : parseCsvGames(text);

  return rows.map((row) => normalizeImportedPlay(row, games));
}

function parseJsonRows(text, listKey) {
  const parsedData = JSON.parse(text);
  const rows = Array.isArray(parsedData) ? parsedData : parsedData[listKey];

  if (!Array.isArray(rows)) {
    throw new Error(`JSON muss eine Liste oder ein Objekt mit ${listKey}-Liste enthalten.`);
  }

  return rows;
}

function buildPlayImportPreview(importedPlays, games) {
  return importedPlays.map((play, index) => {
    const gameExists = games.some((game) => game.id === play.gameId);
    const hasParticipants = play.participants.length > 0;
    const hasDate = Boolean(play.date);
    let status = "ready";
    let message = "Wird importiert";

    if (!gameExists) {
      status = "skipped";
      message = "Spiel nicht gefunden";
    } else if (!hasDate) {
      status = "skipped";
      message = "Datum fehlt";
    } else if (!hasParticipants) {
      status = "skipped";
      message = "Keine Mitspieler";
    }

    return {
      index,
      status,
      message,
      game: play.game,
      date: play.date,
      winner: play.winner,
      duration: play.duration,
      participantCount: play.participants.length,
    };
  });
}

function normalizeImportedPlay(row, games) {
  const gameName = row.game ?? row.title ?? row.name ?? row.spiel ?? "";
  const selectedGame = findGameByTitle(games, gameName);
  const scoringMode = normalizeScoringMode(row.scoringMode ?? row.scoring_mode ?? row.wertung);
  const participants = parseImportedParticipants(row, scoringMode);

  return {
    gameId: selectedGame?.id ?? "",
    game: selectedGame?.title ?? gameName,
    date: normalizeImportDate(row.date ?? row.datum),
    duration: row.duration ?? row.dauer ?? row.playTime ?? row.play_time ?? selectedGame?.duration ?? 0,
    scoringMode,
    participants,
    winner: row.winner ?? row.gewinner ?? "",
    note: row.note ?? row.notiz ?? "",
    useDetailedScoring: false,
  };
}

function findGameByTitle(games, title) {
  const normalizedTitle = normalizeComparableTitle(title);
  return games.find((game) => normalizeComparableTitle(game.title) === normalizedTitle);
}

function normalizeScoringMode(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();

  if (["low", "lowest", "niedrig", "niedrigste punktzahl gewinnt"].includes(normalizedValue)) {
    return "low";
  }

  if (["none", "keine", "keine punkte"].includes(normalizedValue)) {
    return "none";
  }

  return "high";
}

function normalizeImportDate(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  const germanDateMatch = rawValue.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);

  if (germanDateMatch) {
    const [, day, month, year] = germanDateMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
}

function parseImportedParticipants(row, scoringMode) {
  if (Array.isArray(row.participants)) {
    return row.participants
      .map((participant) => ({
        name: participant.name?.trim() ?? "",
        score: scoringMode === "none" ? "" : participant.score ?? "",
      }))
      .filter((participant) => participant.name);
  }

  const participantText = row.participants ?? row.mitspieler ?? "";

  return String(participantText)
    .split(/\||,/)
    .map((entry) => parseParticipantEntry(entry, scoringMode))
    .filter((participant) => participant.name);
}

function parseParticipantEntry(entry, scoringMode) {
  const trimmedEntry = entry.trim();
  const [namePart, scorePart] = trimmedEntry.split(/:|=/);

  return {
    name: namePart?.trim() ?? "",
    score: scoringMode === "none" ? "" : scorePart?.trim() ?? "",
  };
}

function normalizeComparableTitle(title) {
  return String(title ?? "")
    .trim()
    .toLowerCase();
}

function parseCsvGames(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    return [];
  }

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((header) => header.trim().replace(/^\uFEFF/, ""));

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);

    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function detectCsvDelimiter(headerLine) {
  const candidates = [",", ";", "\t"];

  return candidates
    .map((delimiter) => ({ delimiter, count: splitCsvLine(headerLine, delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function splitCsvLine(line, delimiter = ",") {
  const values = [];
  let value = "";
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && isQuoted && nextChar === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      isQuoted = !isQuoted;
      continue;
    }

    if (char === delimiter && !isQuoted) {
      values.push(value.trim());
      value = "";
      continue;
    }

    value += char;
  }

  values.push(value.trim());
  return values;
}


function parseCatalogImport(text, fileName) {
  const rows = fileName.toLowerCase().endsWith(".json")
    ? parseJsonRows(text, "gameCatalog")
    : parseCsvGames(text);

  return rows.map(normalizeImportedCatalogGame).filter((game) => game.name);
}

function buildCatalogImportPreview(importedCatalogGames, existingCatalogGames) {
  const existingKeys = new Set(
    existingCatalogGames.map((game) => `${game.bggId || ""}|${normalizeComparableTitle(game.name)}|${game.year || ""}`),
  );

  return importedCatalogGames.map((game, index) => {
    const key = `${game.bggId || ""}|${normalizeComparableTitle(game.name)}|${game.year || ""}`;
    const isDuplicate = existingKeys.has(key);

    if (!isDuplicate) {
      existingKeys.add(key);
    }

    return {
      ...game,
      index,
      status: isDuplicate ? "duplicate" : "ready",
      message: isDuplicate ? "Bereits im Katalog" : "Bereit",
    };
  });
}

function normalizeImportedCatalogGame(game) {
  const minPlayTime =
    Number(
      getImportValue(game, [
        "minPlayTime",
        "min_play_time",
        "Min. Dauer (Min.)",
        "Min. Spieldauer (Min.)",
        "duration",
        "playingTime",
      ]),
    ) || 0;
  const maxPlayTime =
    Number(
      getImportValue(game, [
        "maxPlayTime",
        "max_play_time",
        "Max. Dauer (Min.)",
        "Max. Spieldauer (Min.)",
        "duration",
        "playingTime",
      ]),
    ) || minPlayTime;

  return {
    id: getImportValue(game, ["id", "catalogId"]) ?? "",
    bggId: getImportValue(game, ["bggId", "bgg_id", "BGG-ID"]) ?? null,
    name: getImportValue(game, ["name", "title", "game", "Spielname"]) ?? "",
    germanTitle: getImportValue(game, ["germanTitle", "deutscherTitel", "deutscher Titel", "Deutscher Titel", "Deutscher Spielname"]) ?? "",
    year: getImportValue(game, ["year", "catalogYear", "Erscheinungsjahr"]) ?? "",
    minPlayers: getImportValue(game, ["minPlayers", "min_players", "Min. Spieler"]) ?? 1,
    maxPlayers:
      getImportValue(game, ["maxPlayers", "max_players", "Max. Spieler"]) ??
      getImportValue(game, ["minPlayers", "min_players", "Min. Spieler"]) ??
      1,
    minPlayTime,
    maxPlayTime,
    playingTime:
      getImportValue(game, ["playingTime", "Spielzeit"]) ||
      (maxPlayTime && minPlayTime !== maxPlayTime
        ? `${minPlayTime}–${maxPlayTime} Min.`
        : `${minPlayTime || maxPlayTime} Min.`),
    rank: getImportValue(game, ["rank", "BGG-Rang"]) ?? null,
    rating: getImportValue(game, ["rating", "Komplexität"]) ?? null,
    image: getImportValue(game, ["image", "Bild", "Bild-URL"]) ?? null,
    expansions: getImportValue(game, ["expansions", "Erweiterungen", "Erweiterungen (Snapshot)"]) ?? "",
  };
}

function getImportValue(row, keys) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function normalizeImportedGame(game) {
  return {
    title: game.title ?? game.name ?? "",
    category: game.category ?? "Import",
    minPlayers: game.minPlayers ?? game.min_players ?? 1,
    maxPlayers: game.maxPlayers ?? game.max_players ?? game.minPlayers ?? game.min_players ?? 1,
    duration: game.duration ?? game.playingTime ?? game.maxPlayTime ?? game.playing_time ?? 0,
    catalogYear: game.catalogYear ?? game.year ?? "",
    bggId: game.bggId ?? game.bgg_id ?? null,
    expansions: game.expansions ?? "",
  };
}
