import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../data/AppDataContext.jsx";

const initialResetSelection = {
  resetGames: false,
  resetPlays: false,
  resetPlayers: false,
};

export default function Admin() {
  const { games, plays, addGames, dataBackend, importLocalDataToFirestore, resetLocalData } = useAppData();
  const [importMessage, setImportMessage] = useState("");
  const [migrationMessage, setMigrationMessage] = useState("");
  const [importPreview, setImportPreview] = useState(null);
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

  async function migrateLocalData() {
    try {
      const result = await importLocalDataToFirestore();
      setMigrationMessage(
        `${result.games} Spiele, ${result.plays} Partien und ${result.playerProfiles} Mitspielerprofile nach Firestore kopiert.`,
      );
    } catch (error) {
      setMigrationMessage(error.message);
    }
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
          <p className="eyebrow">Datenquelle</p>
          <h2>{dataBackend === "firestore" ? "Firestore aktiv" : "Lokale Testdaten aktiv"}</h2>
          <p>
            Firestore speichert Spiele, Partien und Mitspieler zentral. Der lokale Modus bleibt
            über <code>VITE_DATA_BACKEND=local</code> für Tests verfügbar.
          </p>
          <button
            className="button button-secondary"
            disabled={dataBackend !== "firestore"}
            type="button"
            onClick={migrateLocalData}
          >
            Lokale Daten nach Firestore kopieren
          </button>
          {migrationMessage && <p className="form-message">{migrationMessage}</p>}
        </article>

        <article className="panel">
          <p className="eyebrow">Import</p>
          <h2>Spieleliste hochladen</h2>
          <p>
            Unterstützt JSON-Listen oder CSV mit Spalten wie title/name, category, year,
            minPlayers, maxPlayers und duration.
          </p>
          <label className="file-upload">
            <input accept=".json,.csv,text/csv,application/json" type="file" onChange={handleGameImport} />
            Spieleliste auswählen
          </label>
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
        <article className="panel admin-link-card">
          <p className="eyebrow">Mitspieler</p>
          <h2>Spielerliste verwalten</h2>
          <p>Mitspieler suchen, Account-Status pflegen und spätere Benutzerkonten vorbereiten.</p>
          <Link className="button button-secondary" to="/admin/players">
            Mitspieler verwalten
          </Link>
        </article>

        <article className="panel admin-link-card">
          <p className="eyebrow">Spiele</p>
          <h2>Spiele verwalten</h2>
          <p>Spiele suchen, nach Kategorie filtern und ausgewählte Spiele löschen.</p>
          <Link className="button button-secondary" to="/admin/games">
            Spiele löschen
          </Link>
        </article>

        <article className="panel admin-link-card">
          <p className="eyebrow">Partien</p>
          <h2>Partien verwalten</h2>
          <p>Partien nach Spiel, Gewinner und Datum filtern und ausgewählte Einträge löschen.</p>
          <Link className="button button-secondary" to="/admin/plays">
            Partien löschen
          </Link>
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
