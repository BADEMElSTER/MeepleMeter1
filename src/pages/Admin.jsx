import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../data/AppDataContext.jsx";

const initialResetSelection = {
  resetGames: false,
  resetPlays: false,
  resetPlayers: false,
};

export default function Admin() {
  const { games, plays, addGame, resetLocalData } = useAppData();
  const [importMessage, setImportMessage] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetSelection, setResetSelection] = useState(initialResetSelection);

  async function handleGameImport(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const importedGames = parseGameImport(text, file.name);
      let addedCount = 0;

      for (const game of importedGames) {
        if (addGame(game)) {
          addedCount += 1;
        }
      }

      setImportMessage(`${addedCount} von ${importedGames.length} Spielen importiert.`);
    } catch (error) {
      setImportMessage(error.message);
    } finally {
      event.target.value = "";
    }
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

function parseCsvGames(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);

    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function splitCsvLine(line) {
  return line
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map((value) => value.replace(/^"|"$/g, "").replace(/""/g, '"').trim());
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
