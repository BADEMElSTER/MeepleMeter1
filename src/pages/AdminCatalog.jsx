import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Field from "../components/Field.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

const emptyForm = {
  name: "",
  germanTitle: "",
  bggId: "",
  year: "",
  minPlayers: "1",
  maxPlayers: "4",
  minPlayTime: "",
  maxPlayTime: "",
  rank: "",
  rating: "",
  image: "",
  expansions: "",
};

function getCatalogForm(game) {
  return {
    name: game.name ?? "",
    germanTitle: game.germanTitle ?? "",
    bggId: game.bggId ? String(game.bggId) : "",
    year: game.year ? String(game.year) : "",
    minPlayers: String(game.minPlayers ?? 1),
    maxPlayers: String(game.maxPlayers ?? 1),
    minPlayTime: game.minPlayTime ? String(game.minPlayTime) : "",
    maxPlayTime: game.maxPlayTime ? String(game.maxPlayTime) : "",
    rank: game.rank ? String(game.rank) : "",
    rating: game.rating ? String(game.rating) : "",
    image: game.image ?? "",
    expansions: (game.expansions ?? []).map((expansion) => expansion.name).join(", "),
  };
}

export default function AdminCatalog() {
  const { gameCatalog, updateCatalogGame, deleteCatalogGame } = useAppData();
  const [query, setQuery] = useState("");
  const [editingGameId, setEditingGameId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const editFormRef = useRef(null);

  const filteredCatalog = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const sortedCatalog = [...gameCatalog].sort((first, second) =>
      String(first.name).localeCompare(String(second.name), "de"),
    );

    if (!normalizedQuery) {
      return sortedCatalog;
    }

    return sortedCatalog.filter((game) =>
      [game.name, game.germanTitle, game.year, game.bggId, game.playingTime, game.expansions?.map((entry) => entry.name).join(" ")]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery)),
    );
  }, [gameCatalog, query]);

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function startEdit(game) {
    setEditingGameId(game.id);
    setForm(getCatalogForm(game));
    setMessage("");
    window.setTimeout(() => {
      editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function cancelEdit() {
    setEditingGameId(null);
    setForm(emptyForm);
    setMessage("");
  }

  function submitEdit(event) {
    event.preventDefault();

    if (!editingGameId || !form.name.trim()) {
      setMessage("Bitte mindestens einen Spielnamen eintragen.");
      return;
    }

    updateCatalogGame(editingGameId, form);
    setMessage("Katalogspiel gespeichert.");
    cancelEdit();
  }

  function handleDelete(game) {
    if (!window.confirm(`${game.name} wirklich aus dem Spielekatalog löschen?`)) {
      return;
    }

    deleteCatalogGame(game.id);
    if (editingGameId === game.id) {
      cancelEdit();
    }
  }

  return (
    <section className="page">
      <div className="page-heading row-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Spielekatalog verwalten.</h1>
        </div>
        <Link className="ghost-button" to="/admin">Zur Admin-Übersicht</Link>
      </div>

      <article className="panel">
        <Field label="Katalog durchsuchen">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Spiel, Jahr oder BGG-ID suchen"
          />
        </Field>
      </article>

      {editingGameId && (
        <form className="panel" ref={editFormRef} onSubmit={submitEdit}>
          <div className="form-header">
            <div>
              <p className="eyebrow">Katalogspiel bearbeiten</p>
              <h2>{form.name}</h2>
            </div>
            <button className="ghost-button" type="button" onClick={cancelEdit}>Abbrechen</button>
          </div>
          <div className="form-grid">
            <Field label="Originaltitel"><input value={form.name} onChange={(event) => updateField("name", event.target.value)} /></Field>
            <Field label="Deutscher Titel"><input value={form.germanTitle} onChange={(event) => updateField("germanTitle", event.target.value)} /></Field>
            <Field label="BGG-ID"><input value={form.bggId} onChange={(event) => updateField("bggId", event.target.value)} /></Field>
            <Field label="Jahr"><input type="number" value={form.year} onChange={(event) => updateField("year", event.target.value)} /></Field>
            <Field label="Min. Spieler"><input type="number" min="1" value={form.minPlayers} onChange={(event) => updateField("minPlayers", event.target.value)} /></Field>
            <Field label="Max. Spieler"><input type="number" min="1" value={form.maxPlayers} onChange={(event) => updateField("maxPlayers", event.target.value)} /></Field>
            <Field label="Min. Spielzeit"><input type="number" min="0" value={form.minPlayTime} onChange={(event) => updateField("minPlayTime", event.target.value)} /></Field>
            <Field label="Max. Spielzeit"><input type="number" min="0" value={form.maxPlayTime} onChange={(event) => updateField("maxPlayTime", event.target.value)} /></Field>
            <Field label="Rang"><input type="number" min="0" value={form.rank} onChange={(event) => updateField("rank", event.target.value)} /></Field>
            <Field label="Rating"><input type="number" min="0" step="0.1" value={form.rating} onChange={(event) => updateField("rating", event.target.value)} /></Field>
            <Field label="Bild-URL"><input value={form.image} onChange={(event) => updateField("image", event.target.value)} /></Field>
            <Field label="Erweiterungen"><textarea value={form.expansions} onChange={(event) => updateField("expansions", event.target.value)} placeholder="Eine Erweiterung pro Zeile oder mit Komma trennen" /></Field>
          </div>
          {message && <p className="form-message">{message}</p>}
          <button className="button" type="submit">Katalogspiel speichern</button>
        </form>
      )}

      <article className="panel">
        <p className="eyebrow">{filteredCatalog.length} Treffer</p>
        <h2>Spielekatalog</h2>
        <div className="table-scroll">
          <table className="compact-table">
            <thead>
              <tr>
                <th>Spiel</th>
                <th>Originaltitel</th>
                <th>Jahr</th>
                <th>Spieler</th>
                <th>Spielzeit</th>
                <th>BGG</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {filteredCatalog.map((game) => (
                <tr key={game.id}>
                  <td><strong>{game.germanTitle || game.name}</strong></td>
                  <td>{game.germanTitle ? game.name : "-"}</td>
                  <td>{game.year ?? "-"}</td>
                  <td>{game.minPlayers}-{game.maxPlayers}</td>
                  <td>{game.playingTime || "-"}</td>
                  <td>{game.bggId ?? "-"}</td>
                  <td>
                    <div className="table-actions">
                      <button className="ghost-button" type="button" onClick={() => startEdit(game)}>Bearbeiten</button>
                      <button className="ghost-button danger-action" type="button" onClick={() => handleDelete(game)}>Löschen</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
