import { useState } from "react";
import Field from "../components/Field.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function Plays() {
  const { games, plays, addPlay, updatePlay } = useAppData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlayId, setEditingPlayId] = useState(null);
  const [form, setForm] = useState({
    gameId: games[0]?.id ?? "",
    date: getToday(),
    players: "",
    winner: "",
    duration: "",
    note: "",
  });

  function getInitialForm() {
    return {
      gameId: games[0]?.id ?? "",
      date: getToday(),
      players: "",
      winner: "",
      duration: "",
      note: "",
    };
  }

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function openCreateForm() {
    setEditingPlayId(null);
    setForm(getInitialForm());
    setIsFormOpen(true);
  }

  function openEditForm(play) {
    setEditingPlayId(play.id);
    setForm({
      gameId:
        play.gameId ?? games.find((game) => game.title === play.game)?.id ?? games[0]?.id ?? "",
      date: play.date,
      players: String(play.players ?? ""),
      winner: play.winner ?? "",
      duration: String(play.duration ?? ""),
      note: play.note ?? "",
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingPlayId(null);
    setForm(getInitialForm());
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.gameId) {
      return;
    }

    if (editingPlayId) {
      updatePlay(editingPlayId, form);
    } else {
      addPlay(form);
    }

    closeForm();
  }

  return (
    <section className="page">
      <div className="page-heading row-heading">
        <div>
          <p className="eyebrow">Partien</p>
          <h1>Was wurde gespielt?</h1>
        </div>
        <button className="button" type="button" onClick={openCreateForm}>
          Partie erfassen
        </button>
      </div>

      {isFormOpen && (
        <form className="entry-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <div>
              <p className="eyebrow">{editingPlayId ? "Partie bearbeiten" : "Neue Partie"}</p>
              <h2>
                {editingPlayId
                  ? "Fehlende Angaben nachtragen."
                  : "Spieleabend dokumentieren."}
              </h2>
            </div>
            <button className="ghost-button" type="button" onClick={closeForm}>
              Abbrechen
            </button>
          </div>
          <div className="form-grid">
            <Field label="Spiel">
              <select
                required
                value={form.gameId}
                onChange={(event) => updateField("gameId", event.target.value)}
              >
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Datum">
              <input
                type="date"
                value={form.date}
                onChange={(event) => updateField("date", event.target.value)}
              />
            </Field>
            <Field label="Spieleranzahl">
              <input
                min="1"
                type="number"
                value={form.players}
                onChange={(event) => updateField("players", event.target.value)}
                placeholder="4"
              />
            </Field>
            <Field label="Gewinner">
              <input
                value={form.winner}
                onChange={(event) => updateField("winner", event.target.value)}
                placeholder="Name"
              />
            </Field>
            <Field label="Dauer in Minuten">
              <input
                min="0"
                type="number"
                value={form.duration}
                onChange={(event) => updateField("duration", event.target.value)}
                placeholder="75"
              />
            </Field>
            <Field label="Notiz">
              <textarea
                value={form.note}
                onChange={(event) => updateField("note", event.target.value)}
                placeholder="Was war bemerkenswert?"
              />
            </Field>
          </div>
          <button className="button" type="submit">
            {editingPlayId ? "Änderungen speichern" : "Partie speichern"}
          </button>
        </form>
      )}

      <div className="play-list">
        {plays.map((play) => (
          <article className="play-card" key={play.id}>
            <div>
              <span>{new Date(play.date).toLocaleDateString("de-DE")}</span>
              <h2>{play.game}</h2>
              <p>{play.note}</p>
              <button className="ghost-button inline-action" type="button" onClick={() => openEditForm(play)}>
                Bearbeiten
              </button>
            </div>
            <dl>
              <div>
                <dt>Spieler</dt>
                <dd>{play.players}</dd>
              </div>
              <div>
                <dt>Gewinner</dt>
                <dd>{play.winner}</dd>
              </div>
              <div>
                <dt>Dauer</dt>
                <dd>{play.duration} Min.</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
