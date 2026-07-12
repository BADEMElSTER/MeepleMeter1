import { useState } from "react";
import Field from "../components/Field.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

const initialForm = {
  title: "",
  category: "",
  players: "",
  duration: "",
  rating: "",
};

export default function Games() {
  const { games, addGame } = useAppData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    addGame(form);
    setForm(initialForm);
    setIsFormOpen(false);
  }

  return (
    <section className="page">
      <div className="page-heading row-heading">
        <div>
          <p className="eyebrow">Sammlung</p>
          <h1>Deine Spiele.</h1>
        </div>
        <button className="button" type="button" onClick={() => setIsFormOpen(true)}>
          Spiel hinzufügen
        </button>
      </div>

      {isFormOpen && (
        <form className="entry-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <div>
              <p className="eyebrow">Neues Spiel</p>
              <h2>Spiel zur Sammlung hinzufügen.</h2>
            </div>
            <button className="ghost-button" type="button" onClick={() => setIsFormOpen(false)}>
              Schließen
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
            <Field label="Spielerzahl">
              <input
                value={form.players}
                onChange={(event) => updateField("players", event.target.value)}
                placeholder="2–6"
              />
            </Field>
            <Field label="Dauer in Minuten">
              <input
                min="0"
                type="number"
                value={form.duration}
                onChange={(event) => updateField("duration", event.target.value)}
                placeholder="60"
              />
            </Field>
            <Field label="Bewertung">
              <input
                max="10"
                min="0"
                step="0.1"
                type="number"
                value={form.rating}
                onChange={(event) => updateField("rating", event.target.value)}
                placeholder="8.0"
              />
            </Field>
          </div>
          <button className="button" type="submit">
            Spiel speichern
          </button>
        </form>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Spiel</th>
              <th>Kategorie</th>
              <th>Spieler</th>
              <th>Dauer</th>
              <th>Partien</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id}>
                <td>
                  <strong>{game.title}</strong>
                </td>
                <td>{game.category}</td>
                <td>{game.players}</td>
                <td>{game.duration} Min.</td>
                <td>{game.plays}</td>
                <td>{game.rating.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
