import { useState } from "react";
import Field from "../components/Field.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

const initialForm = {
  title: "",
  category: "",
  minPlayers: "1",
  maxPlayers: "4",
  duration: "",
};

function getGameForm(game) {
  return {
    title: game.title,
    category: game.category,
    minPlayers: String(game.minPlayers),
    maxPlayers: String(game.maxPlayers),
    duration: String(game.duration),
  };
}

export default function Games() {
  const { stats, addGame, updateGame, deleteGame } = useAppData();
  const games = stats.gamesWithPlayCounts;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGameId, setEditingGameId] = useState(null);
  const [form, setForm] = useState(initialForm);

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function openCreateForm() {
    setEditingGameId(null);
    setForm(initialForm);
    setIsFormOpen(true);
  }

  function openEditForm(game) {
    setEditingGameId(game.id);
    setForm(getGameForm(game));
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingGameId(null);
    setForm(initialForm);
    setIsFormOpen(false);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    if (editingGameId) {
      updateGame(editingGameId, form);
    } else {
      addGame(form);
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
              <th>Spiel</th>
              <th>Kategorie</th>
              <th>Min.</th>
              <th>Max.</th>
              <th>Vorgegebene Spielzeit</th>
              <th>Ø tatsächliche Spielzeit</th>
              <th>Partien</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id}>
                <td>
                  <strong>{game.title}</strong>
                </td>
                <td>{game.category}</td>
                <td>{game.minPlayers}</td>
                <td>{game.maxPlayers}</td>
                <td>{game.duration} Min.</td>
                <td>{game.averagePlayedDuration ? `${game.averagePlayedDuration} Min.` : "–"}</td>
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
