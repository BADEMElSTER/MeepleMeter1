import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import Field from "../components/Field.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

function createCategory() {
  return {
    id: crypto.randomUUID?.() ?? `category-${Date.now()}`,
    name: "",
    type: "plus",
    multiplier: 1,
  };
}

export default function GameScoring() {
  const { gameId } = useParams();
  const { games, updateGameScoreCategories } = useAppData();
  const game = useMemo(() => games.find((entry) => entry.id === gameId), [gameId, games]);
  const [categories, setCategories] = useState(() =>
    game?.scoreCategories?.length ? game.scoreCategories : [createCategory()],
  );
  const [message, setMessage] = useState("");

  if (!game) {
    return <Navigate to="/games" replace />;
  }

  function updateCategory(categoryId, field, value) {
    setMessage("");
    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId ? { ...category, [field]: value } : category,
      ),
    );
  }

  function addCategory() {
    setCategories((currentCategories) => [...currentCategories, createCategory()]);
  }

  function removeCategory(categoryId) {
    setCategories((currentCategories) =>
      currentCategories.length === 1
        ? [createCategory()]
        : currentCategories.filter((category) => category.id !== categoryId),
    );
  }

  function saveCategories(event) {
    event.preventDefault();
    const cleanCategories = categories.filter((category) => category.name.trim());

    updateGameScoreCategories(game.id, cleanCategories);
    setCategories(cleanCategories.length ? cleanCategories : [createCategory()]);
    setMessage("Punktewertung gespeichert.");
  }

  return (
    <section className="page">
      <div className="page-heading row-heading">
        <div>
          <p className="eyebrow">Punktewertung</p>
          <h1>{game.title}</h1>
          <p className="page-intro">
            Lege Kategorien fest, aus denen bei einer Partie optional automatisch eine Gesamtpunktzahl berechnet wird.
          </p>
        </div>
        <Link className="ghost-button" to="/games">
          Zur Sammlung
        </Link>
      </div>

      <form className="entry-form" onSubmit={saveCategories}>
        <div className="form-header">
          <div>
            <p className="eyebrow">Kategorien</p>
            <h2>Punkte-Kategorien erfassen.</h2>
          </div>
          <button className="button button-secondary" type="button" onClick={addCategory}>
            Kategorie hinzufügen
          </button>
        </div>

        <div className="score-category-list">
          {categories.map((category) => (
            <div className="score-category-row" key={category.id}>
              <Field label="Kategorie">
                <input
                  value={category.name}
                  onChange={(event) => updateCategory(category.id, "name", event.target.value)}
                  placeholder="z. B. Pflanzen, Gebäude, Münzen"
                />
              </Field>
              <Field label="Wertung">
                <select
                  value={category.type}
                  onChange={(event) => updateCategory(category.id, "type", event.target.value)}
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
                  onChange={(event) => updateCategory(category.id, "multiplier", event.target.value)}
                />
              </Field>
              <button
                className="ghost-button danger-action score-category-delete"
                type="button"
                onClick={() => removeCategory(category.id)}
              >
                Entfernen
              </button>
            </div>
          ))}
        </div>

        {message && <p className="form-message">{message}</p>}
        <button className="button" type="submit">
          Punktewertung speichern
        </button>
      </form>
    </section>
  );
}
