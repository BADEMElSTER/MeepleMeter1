import { useState } from "react";
import Field from "../components/Field.jsx";
import GameLink from "../components/GameLink.jsx";
import PlayerLink from "../components/PlayerLink.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

const defaultPlayerNames = ["Basti", "Nina", "Tom", "Lea"];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getScoringLabel(scoringMode) {
  if (scoringMode === "low") {
    return "Niedrigste Punktzahl gewinnt";
  }

  if (scoringMode === "none") {
    return "Keine Punkte";
  }

  return "Höchste Punktzahl gewinnt";
}

export default function Plays() {
  const { games, plays, addPlay, updatePlay, deletePlay } = useAppData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlayId, setEditingPlayId] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const knownPlayerNames = getKnownPlayerNames(plays, []);
  const [form, setForm] = useState(getInitialForm(knownPlayerNames, games));
  const sortedPlayerNames = getKnownPlayerNames(plays, form.participants);
  const selectablePlayerNames = [
    ...new Set([...sortedPlayerNames, ...form.participants.map((participant) => participant.name)]),
  ];
  const detailedPlayerNames = selectablePlayerNames.slice(0, 4);
  const dropdownPlayerNames = selectablePlayerNames
    .filter((name) => !detailedPlayerNames.includes(name))
    .filter((name) => name.toLowerCase().includes(playerSearch.toLowerCase()));

  function getInitialForm(playerNames = knownPlayerNames, availableGames = games) {
    return {
      gameId: availableGames[0]?.id ?? "",
      date: getToday(),
      scoringMode: "high",
      participants: playerNames.slice(0, 2).map((name) => ({ name, score: "" })),
      winner: "",
      duration: "",
      note: "",
    };
  }

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function toggleParticipant(name) {
    setForm((currentForm) => {
      const isSelected = currentForm.participants.some((participant) => participant.name === name);

      return {
        ...currentForm,
        participants: isSelected
          ? currentForm.participants.filter((participant) => participant.name !== name)
          : [...currentForm.participants, { name, score: "" }],
      };
    });
  }

  function updateParticipantScore(name, score) {
    setForm((currentForm) => ({
      ...currentForm,
      participants: currentForm.participants.map((participant) =>
        participant.name === name ? { ...participant, score } : participant,
      ),
    }));
  }

  function addPlayerName() {
    const name = newPlayerName.trim();

    if (!name || form.participants.some((participant) => participant.name === name)) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      participants: [...currentForm.participants, { name, score: "" }],
    }));
    setNewPlayerName("");
    setPlayerSearch("");
  }

  function openCreateForm() {
    setEditingPlayId(null);
    setForm(getInitialForm(sortedPlayerNames, games));
    setIsFormOpen(true);
  }

  function openEditForm(play) {
    setEditingPlayId(play.id);
    setForm({
      gameId:
        play.gameId ?? games.find((game) => game.title === play.game)?.id ?? games[0]?.id ?? "",
      date: play.date,
      scoringMode: play.scoringMode ?? "none",
      participants:
        play.participants?.length > 0
          ? play.participants.map((participant) => ({
              name: participant.name,
              score: participant.score ?? "",
            }))
          : [{ name: play.winner ?? "Spieler 1", score: "" }],
      winner: play.winner ?? "",
      duration: String(play.duration ?? ""),
      note: play.note ?? "",
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingPlayId(null);
    setNewPlayerName("");
    setPlayerSearch("");
    setForm(getInitialForm(sortedPlayerNames, games));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.gameId || !form.participants.length) {
      return;
    }

    if (editingPlayId) {
      updatePlay(editingPlayId, form);
    } else {
      addPlay(form);
    }

    closeForm();
  }

  function handleDelete(play) {
    const confirmed = window.confirm(`Partie "${play.game}" vom ${new Date(play.date).toLocaleDateString("de-DE")} löschen?`);

    if (confirmed) {
      deletePlay(play.id);
    }
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
                  ? "Mitspieler und Punkte nachtragen."
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
            <Field label="Tatsächliche Spielzeit in Minuten">
              <input
                min="0"
                type="number"
                value={form.duration}
                onChange={(event) => updateField("duration", event.target.value)}
                placeholder="75"
              />
            </Field>
            <Field label="Wertung">
              <select
                value={form.scoringMode}
                onChange={(event) => updateField("scoringMode", event.target.value)}
              >
                <option value="high">Höchste Punktzahl gewinnt</option>
                <option value="low">Niedrigste Punktzahl gewinnt</option>
                <option value="none">Keine Punkte</option>
              </select>
            </Field>
            {form.scoringMode === "none" && (
              <Field label="Gewinner">
                <input
                  value={form.winner}
                  onChange={(event) => updateField("winner", event.target.value)}
                  placeholder="Name oder offen lassen"
                />
              </Field>
            )}
            <Field label="Notiz">
              <textarea
                value={form.note}
                onChange={(event) => updateField("note", event.target.value)}
                placeholder="Was war bemerkenswert?"
              />
            </Field>
          </div>

          <section className="participant-section">
            <div className="form-header">
              <div>
                <p className="eyebrow">Mitspieler</p>
                <h3>Wer hat mitgespielt?</h3>
              </div>
              <span>{form.participants.length} ausgewählt</span>
            </div>

            <div className="participant-options">
              {detailedPlayerNames.map((name) => {
                const participant = form.participants.find((entry) => entry.name === name);
                const isSelected = Boolean(participant);

                return (
                  <label className="participant-row" key={name}>
                    <input
                      checked={isSelected}
                      type="checkbox"
                      onChange={() => toggleParticipant(name)}
                    />
                    <span>{name}</span>
                    {form.scoringMode !== "none" && (
                      <input
                        disabled={!isSelected}
                        type="number"
                        value={participant?.score ?? ""}
                        onChange={(event) => updateParticipantScore(name, event.target.value)}
                        placeholder="Punkte"
                      />
                    )}
                  </label>
                );
              })}
            </div>

            {selectablePlayerNames.length > 4 && (
              <div className="participant-dropdown">
                <Field label="Weitere Mitspieler suchen">
                  <input
                    value={playerSearch}
                    onChange={(event) => setPlayerSearch(event.target.value)}
                    placeholder="Name suchen"
                  />
                </Field>
                <div className="dropdown-player-list">
                  {dropdownPlayerNames.map((name) => {
                    const participant = form.participants.find((entry) => entry.name === name);
                    const isSelected = Boolean(participant);

                    return (
                      <label className="participant-row" key={name}>
                        <input
                          checked={isSelected}
                          type="checkbox"
                          onChange={() => toggleParticipant(name)}
                        />
                        <span>{name}</span>
                        {form.scoringMode !== "none" && (
                          <input
                            disabled={!isSelected}
                            type="number"
                            value={participant?.score ?? ""}
                            onChange={(event) => updateParticipantScore(name, event.target.value)}
                            placeholder="Punkte"
                          />
                        )}
                      </label>
                    );
                  })}
                  {dropdownPlayerNames.length === 0 && (
                    <p className="empty-hint">Kein weiterer Mitspieler gefunden.</p>
                  )}
                </div>
              </div>
            )}

            <div className="add-player-row">
              <input
                value={newPlayerName}
                onChange={(event) => setNewPlayerName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addPlayerName();
                  }
                }}
                placeholder="Neuer Mitspieler"
              />
              <button className="button button-secondary" type="button" onClick={addPlayerName}>
                Hinzufügen
              </button>
            </div>
          </section>

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
              <h2>
                <GameLink gameId={play.gameId} title={play.game} />
              </h2>
              <p>{play.note}</p>
              <div className="participant-summary">
                {(play.participants ?? []).map((participant) => (
                  <span key={participant.name}>
                    <PlayerLink name={participant.name}>{participant.name}</PlayerLink>
                    {play.scoringMode !== "none" && participant.score !== null
                      ? ` · ${participant.score} P.`
                      : ""}
                  </span>
                ))}
              </div>
              <button
                className="ghost-button inline-action"
                type="button"
                onClick={() => openEditForm(play)}
              >
                Bearbeiten
              </button>
              <button
                className="ghost-button danger-action inline-action"
                type="button"
                onClick={() => handleDelete(play)}
              >
                Löschen
              </button>
            </div>
            <dl>
              <div>
                <dt>Mitspieler</dt>
                <dd>{play.players}</dd>
              </div>
              <div>
                <dt>Wertung</dt>
                <dd>{getScoringLabel(play.scoringMode)}</dd>
              </div>
              <div>
                <dt>Gewinner</dt>
                <dd>
                  <PlayerLink name={play.winner}>{play.winner}</PlayerLink>
                </dd>
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

function getKnownPlayerNames(plays, currentParticipants) {
  const frequencies = new Map();

  for (const name of defaultPlayerNames) {
    frequencies.set(name, 0);
  }

  for (const play of plays) {
    for (const participant of play.participants ?? []) {
      frequencies.set(participant.name, (frequencies.get(participant.name) ?? 0) + 1);
    }
  }

  for (const participant of currentParticipants) {
    if (!frequencies.has(participant.name)) {
      frequencies.set(participant.name, 0);
    }
  }

  return [...frequencies.entries()]
    .toSorted((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .map(([name]) => name);
}
