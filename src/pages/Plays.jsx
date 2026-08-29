import { useEffect, useState } from "react";
import Field from "../components/Field.jsx";
import GameLink from "../components/GameLink.jsx";
import PlayerLink from "../components/PlayerLink.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getScoringLabel(scoringMode) {
  if (scoringMode === "low") {
    return "Niedrigste Punktzahl gewinnt";
  }

  if (scoringMode === "placement") {
    return "Platzierung eingeben";
  }

  if (scoringMode === "none") {
    return "Keine Punkte";
  }

  return "Höchste Punktzahl gewinnt";
}

export default function Plays() {
  const { userProfile } = useAuth();
  const { games, plays, playerProfiles, addPlay, updatePlay, deletePlay } = useAppData();
  const username = userProfile?.username || userProfile?.displayName || "";
  const normalizedUsername = username.trim().toLowerCase();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlayId, setEditingPlayId] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [formError, setFormError] = useState("");
  const [playScope, setPlayScope] = useState("mine");
  const deletedPlayerNames = playerProfiles
    .filter((profile) => profile.isDeleted)
    .map((profile) => profile.name.trim().toLowerCase());
  const knownPlayerNames = getKnownPlayerNames(plays, [], username, deletedPlayerNames);
  const [form, setForm] = useState(getInitialForm(knownPlayerNames, games));
  const sortedPlayerNames = getKnownPlayerNames(plays, form.participants, username, deletedPlayerNames);
  const selectablePlayerNames = sortSelectablePlayerNames([
    ...new Set([...sortedPlayerNames, ...form.participants.map((participant) => participant.name)]),
  ], form.participants, plays, username);
  const detailedPlayerNames = selectablePlayerNames.slice(0, 4);
  const dropdownPlayerNames = selectablePlayerNames
    .filter((name) => !detailedPlayerNames.includes(name))
    .filter((name) => name.toLowerCase().includes(playerSearch.toLowerCase()));
  const selectedGame = games.find((game) => game.id === form.gameId);
  const scoreCategories = selectedGame?.scoreCategories ?? [];
  const isRoundGame = Boolean(selectedGame?.isRoundGame);
  const canUseDetailedScoring =
    form.scoringMode !== "none" && (scoreCategories.length > 0 || isRoundGame);
  const ownPlays = normalizedUsername
    ? plays.filter((play) => hasParticipant(play, normalizedUsername))
    : [];
  const visiblePlays = playScope === "mine" ? ownPlays : plays;
  const hasUnsavedPlayChanges = isFormOpen && isPlayFormDirty(form);

  useEffect(() => {
    window.__meepleMeterHasUnsavedPlay = hasUnsavedPlayChanges;

    function handleBeforeUnload(event) {
      if (!window.__meepleMeterHasUnsavedPlay) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    function handleLinkClick(event) {
      const link = event.target.closest?.("a[href]");

      if (!link || !window.__meepleMeterHasUnsavedPlay) {
        return;
      }

      if (!window.confirm("Ungespeicherte Punkte verwerfen?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true);

    return () => {
      window.__meepleMeterHasUnsavedPlay = false;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [hasUnsavedPlayChanges]);

  function getInitialForm(playerNames = knownPlayerNames, availableGames = games) {
    const defaultGame = availableGames[0];

    return {
      gameId: defaultGame?.id ?? "",
      date: getToday(),
      scoringMode: defaultGame?.defaultScoringMode ?? "high",
      participants: playerNames.slice(0, 2).map((name) => ({ name, score: "" })),
      useDetailedScoring: false,
      roundCount: 0,
      roundCompleted: {},
      winner: "",
      duration: "",
      note: "",
    };
  }

  function updateField(field, value) {
    setFormError("");
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function toggleParticipant(name) {
    setFormError("");
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
    setFormError("");
    setForm((currentForm) => ({
      ...currentForm,
      participants: currentForm.participants.map((participant) =>
        participant.name === name ? { ...participant, score } : participant,
      ),
    }));
  }

  function updateParticipantScoreDetail(name, categoryId, value) {
    setFormError("");
    setForm((currentForm) => ({
      ...currentForm,
      participants: currentForm.participants.map((participant) =>
        participant.name === name
          ? {
              ...participant,
              scoreDetails: {
                ...(participant.scoreDetails ?? {}),
                [categoryId]: value,
              },
              score: calculateDetailedScore(
                {
                  ...participant,
                  scoreDetails: {
                    ...(participant.scoreDetails ?? {}),
                    [categoryId]: value,
                  },
                },
                scoreCategories,
                currentForm.roundCount || currentForm.participants.length,
              ),
            }
          : participant,
      ),
    }));
  }

  function updateSelectedGame(gameId) {
    const nextGame = games.find((game) => game.id === gameId);

    setForm((currentForm) => ({
      ...currentForm,
      gameId,
      scoringMode: nextGame?.defaultScoringMode ?? "high",
      useDetailedScoring: false,
      roundCount: 0,
    }));
  }

  function updateParticipantRoundScore(name, roundIndex, value) {
    setFormError("");
    setForm((currentForm) => ({
      ...currentForm,
      participants: currentForm.participants.map((participant) =>
        participant.name === name
          ? {
              ...participant,
              roundScores: {
                ...(participant.roundScores ?? {}),
                [roundIndex]: value,
              },
              score: calculateDetailedScore(
                {
                  ...participant,
                  roundScores: {
                    ...(participant.roundScores ?? {}),
                    [roundIndex]: value,
                  },
                },
                scoreCategories,
                currentForm.roundCount || currentForm.participants.length,
              ),
            }
          : participant,
      ),
    }));
  }

  function addRoundBlock() {
    setFormError("");
    setForm((currentForm) => {
      const playerCount = Math.max(currentForm.participants.length, 1);
      const currentRoundCount = Math.max(currentForm.roundCount || 0, playerCount);

      return {
        ...currentForm,
        roundCount: currentRoundCount + playerCount,
      };
    });
  }

  function toggleRoundCompleted(roundIndex) {
    setForm((currentForm) => ({
      ...currentForm,
      roundCompleted: {
        ...(currentForm.roundCompleted ?? {}),
        [roundIndex]: !currentForm.roundCompleted?.[roundIndex],
      },
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
    setFormError("");
    setForm(getInitialForm(sortedPlayerNames, games));
    setIsFormOpen(true);
  }

  function openEditForm(play) {
    setEditingPlayId(play.id);
    setFormError("");
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
              scoreDetails: participant.scoreDetails ?? {},
              roundScores: participant.roundScores ?? {},
            }))
          : [{ name: play.winner ?? "Spieler 1", score: "" }],
      useDetailedScoring: Boolean(play.useDetailedScoring),
      roundCount: play.roundCount ?? getStoredRoundCount(play.participants),
      roundCompleted: play.roundCompleted ?? {},
      winner: play.winner ?? "",
      duration: String(play.duration ?? ""),
      note: play.note ?? "",
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isPlayFormDirty(form) && !window.confirm("Ungespeicherte Punkte verwerfen?")) {
      return;
    }

    resetForm();
  }

  function resetForm() {
    setIsFormOpen(false);
    setEditingPlayId(null);
    setNewPlayerName("");
    setPlayerSearch("");
    setFormError("");
    setForm(getInitialForm(sortedPlayerNames, games));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.gameId || !form.participants.length) {
      setFormError("Bitte wähle mindestens einen Mitspieler aus.");
      return;
    }

    const formToSave =
      form.useDetailedScoring && canUseDetailedScoring
        ? {
            ...form,
            participants: form.participants.map((participant) => ({
              ...participant,
              score: calculateDetailedScore(
                participant,
                scoreCategories,
                form.roundCount || form.participants.length,
              ),
            })),
          }
        : form;

    if (formToSave.scoringMode !== "none" && hasMissingScores(formToSave.participants)) {
      setFormError("Bitte trage für alle ausgewählten Mitspieler Punkte ein.");
      return;
    }

    if (editingPlayId) {
      updatePlay(editingPlayId, formToSave);
    } else {
      addPlay(formToSave);
    }

    resetForm();
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
                  onChange={(event) =>
                  updateSelectedGame(event.target.value)
                }
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
              />
            </Field>
            <Field label="Wertung">
              <select
                value={form.scoringMode}
                onChange={(event) => updateField("scoringMode", event.target.value)}
              >
                <option value="high">Höchste Punktzahl gewinnt</option>
                <option value="low">Niedrigste Punktzahl gewinnt</option>
                <option value="placement">Platzierung eingeben</option>
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
            {canUseDetailedScoring && (
              <label className="checkbox-field">
                <input
                  checked={Boolean(form.useDetailedScoring)}
                  type="checkbox"
                  onChange={(event) => updateField("useDetailedScoring", event.target.checked)}
                />
                Detaillierte Punktewertung für dieses Spiel nutzen
              </label>
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
                        readOnly={form.useDetailedScoring}
                        placeholder={
                          form.useDetailedScoring ? "Gesamt" : form.scoringMode === "placement" ? "Platz" : "Punkte"
                        }
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
                            readOnly={form.useDetailedScoring}
                            placeholder={
                              form.useDetailedScoring ? "Gesamt" : form.scoringMode === "placement" ? "Platz" : "Punkte"
                            }
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

            {form.useDetailedScoring && canUseDetailedScoring && (
              <section className="play-scoring-panel">
                <div className="form-header">
                  <div>
                    <p className="eyebrow">Punktewertung</p>
                  </div>
                  {!isRoundGame && <span>{scoreCategories.length} Kategorien</span>}
                </div>

                <ScoreDetailMatrix
                  categories={scoreCategories}
                  participants={form.participants}
                  roundScoringMode={selectedGame?.roundScoringMode}
                  roundCount={form.roundCount}
                  showRounds={isRoundGame}
                  onChange={updateParticipantScoreDetail}
                  onRoundChange={updateParticipantRoundScore}
                  onAddRoundBlock={addRoundBlock}
                  onToggleRoundCompleted={toggleRoundCompleted}
                  roundCompleted={form.roundCompleted}
                />
              </section>
            )}
          </section>

          {formError && <p className="form-message form-message-error">{formError}</p>}

          <button className="button" type="submit">
            {editingPlayId ? "Änderungen speichern" : "Partie speichern"}
          </button>
        </form>
      )}

      <div className="play-scope-tabs" aria-label="Partien filtern">
        <button
          className={playScope === "mine" ? "active" : ""}
          type="button"
          onClick={() => setPlayScope("mine")}
        >
          Meine Partien
        </button>
        <button
          className={playScope === "all" ? "active" : ""}
          type="button"
          onClick={() => setPlayScope("all")}
        >
          Alle Partien
        </button>
      </div>

      <div className="play-list">
        {visiblePlays.length ? (
          visiblePlays.map((play) => {
          const sortedParticipants = sortParticipantsByScore(play.participants ?? [], play.scoringMode);

          return (
            <article className="play-card compact-play-card" key={play.id}>
              <div className="play-card-main">
                <div className="play-card-topline">
                  <span>{new Date(play.date).toLocaleDateString("de-DE")}</span>
                  <strong>{play.duration} Min.</strong>
                  <details className="play-info-menu">
                    <summary aria-label={`Weitere Informationen zu ${play.game}`}>i</summary>
                    <div className="play-info-content">
                      <p>{play.note || "Keine Notiz erfasst."}</p>
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
                      </dl>
                      <div className="play-card-actions">
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
                    </div>
                  </details>
                </div>
                <h2>
                  <GameLink gameId={play.gameId} title={play.game} />
                </h2>
                <div className="participant-summary">
                  {sortedParticipants.map((participant) => {
                    const isWinner = participant.name === play.winner;

                    return (
                      <span
                        className={
                          participant.name.trim().toLowerCase() === normalizedUsername
                            ? "own-participant-chip"
                            : ""
                        }
                        key={participant.name}
                      >
                        {isWinner && (
                          <span className="winner-trophy" aria-label="Gewinner" title="Gewinner" />
                        )}
                        <PlayerLink name={participant.name}>{participant.name}</PlayerLink>
                        {play.scoringMode !== "none" && participant.score !== null
                          ? ` - ${participant.score} P.`
                          : ""}
                      </span>
                    );
                  })}
                </div>
              </div>
              <dl className="play-card-meta">
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
          );
        })
        ) : (
          <article className="play-card compact-play-card empty-play-card">
            <p>
              {playScope === "mine"
                ? "Für dich wurden noch keine Partien erfasst."
                : "Es wurden noch keine Partien erfasst."}
            </p>
          </article>
        )}
      </div>
    </section>
  );
}

function hasMissingScores(participants) {
  return participants.some((participant) => {
    const score = String(participant.score ?? "").trim();
    return score === "" || !Number.isFinite(Number(score));
  });
}

function isPlayFormDirty(form) {
  if (!form) {
    return false;
  }

  const hasParticipantScores = (form.participants ?? []).some((participant) => {
    const hasScore = String(participant.score ?? "").trim() !== "";
    const hasScoreDetails = Object.values(participant.scoreDetails ?? {}).some(
      (value) => String(value ?? "").trim() !== "",
    );
    const hasRoundScores = Object.values(participant.roundScores ?? {}).some(
      (value) => String(value ?? "").trim() !== "",
    );

    return hasScore || hasScoreDetails || hasRoundScores;
  });

  return (
    hasParticipantScores ||
    String(form.duration ?? "").trim() !== "" ||
    String(form.note ?? "").trim() !== "" ||
    String(form.winner ?? "").trim() !== ""
  );
}

function hasParticipant(play, normalizedUsername) {
  return play.participants?.some(
    (participant) => participant.name?.trim().toLowerCase() === normalizedUsername,
  );
}

function getStoredRoundCount(participants = []) {
  const storedRounds = participants.reduce((maxRound, participant) => {
    const roundIndexes = Object.keys(participant.roundScores ?? {})
      .map((roundIndex) => Number(roundIndex))
      .filter((roundIndex) => Number.isFinite(roundIndex));

    return Math.max(maxRound, ...roundIndexes.map((roundIndex) => roundIndex + 1), 0);
  }, 0);

  return Math.max(storedRounds, participants.length);
}

function sortParticipantsByScore(participants, scoringMode) {
  if (scoringMode === "none") {
    return [...participants].sort((first, second) => first.name.localeCompare(second.name, "de"));
  }

  return [...participants].sort((first, second) => {
    const firstScore = Number(first.score);
    const secondScore = Number(second.score);

    if (!Number.isFinite(firstScore) && !Number.isFinite(secondScore)) {
      return first.name.localeCompare(second.name, "de");
    }

    if (!Number.isFinite(firstScore)) {
      return 1;
    }

    if (!Number.isFinite(secondScore)) {
      return -1;
    }

    return scoringMode === "low" || scoringMode === "placement"
      ? firstScore - secondScore
      : secondScore - firstScore;
  });
}

function calculateDetailedScore(participant = {}, categories = [], roundCount = 0) {
  const scoreDetails = participant.scoreDetails ?? {};
  const categoryScore = categories.reduce((sum, category) => {
    const rawValue = Number(scoreDetails[category.id]) || 0;
    const multiplier = Number(category.multiplier) || 1;
    const value = rawValue * multiplier;

    return category.type === "minus" ? sum - value : sum + value;
  }, 0);

  const roundScore = Array.from({ length: roundCount }).reduce(
    (sum, _entry, roundIndex) => sum + (Number(participant.roundScores?.[roundIndex]) || 0),
    0,
  );

  return categoryScore + roundScore;
}

function getRoundWinnerNames(participants = [], roundIndex, roundScoringMode) {
  const hasAnyRoundScore = participants.some(
    (participant) => String(participant.roundScores?.[roundIndex] ?? "").trim() !== "",
  );

  if (!hasAnyRoundScore) {
    return new Set();
  }

  const scoredParticipants = participants
    .map((participant) => ({
      name: participant.name,
      score: Number(participant.roundScores?.[roundIndex] ?? 0),
    }))
    .filter((participant) => Number.isFinite(participant.score));

  if (!scoredParticipants.length) {
    return new Set();
  }

  const winningScore =
    roundScoringMode === "minus"
      ? Math.min(...scoredParticipants.map((participant) => participant.score))
      : Math.max(...scoredParticipants.map((participant) => participant.score));

  return new Set(
    scoredParticipants
      .filter((participant) => participant.score === winningScore)
      .map((participant) => participant.name),
  );
}

function ScoreDetailMatrix({
  categories,
  onChange,
  onAddRoundBlock,
  onRoundChange,
  participants,
  roundCount = 0,
  roundScoringMode,
  showRounds,
}) {
  const roundBlockSize = Math.max(participants.length, 1);
  const visibleRoundCount = Math.max(Number(roundCount) || 0, roundBlockSize);
  const roundIndexes = Array.from({ length: visibleRoundCount }, (_entry, index) => index);
  const roundScoringLabel = roundScoringMode === "minus" ? "Minuspunkte" : "Punkte";

  return (
    <div className="score-detail-matrix-wrap no-page-swipe">
      {categories.length > 0 && (
        <table className="score-detail-matrix">
          <thead>
            <tr>
              <th>Kategorie</th>
              {participants.map((participant) => (
                <th key={participant.name}>{participant.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <th>
                  {category.name} {category.type === "minus" ? "\u2212" : "+"}
                  {Number(category.multiplier) !== 1 ? ` \u00d7 ${category.multiplier}` : ""}
                </th>
                {participants.map((participant) => (
                  <td key={`${category.id}-${participant.name}`}>
                    <input
                      type="number"
                      value={participant?.scoreDetails?.[category.id] ?? ""}
                      onChange={(event) => onChange(participant.name, category.id, event.target.value)}
                      placeholder="0"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showRounds && (
        <table className="score-detail-matrix round-score-matrix">
          <thead>
            <tr>
              <th>Spiel ({roundScoringLabel})</th>
              {participants.map((participant) => (
                <th key={participant.name}>
                  <span>{participant.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roundIndexes.map((roundIndex) => {
              const roundWinnerNames = getRoundWinnerNames(participants, roundIndex, roundScoringMode);

              return (
                <tr
                  className={roundIndex > 0 && roundIndex % roundBlockSize === 0 ? "round-block-start" : ""}
                  key={`round-${roundIndex}`}
                >
                  <th>Spiel {roundIndex + 1}</th>
                  {participants.map((participant) => {
                    const isRoundWinner = roundWinnerNames.has(participant.name);

                    return (
                      <td className={isRoundWinner ? "round-winner-cell" : ""} key={`${roundIndex}-${participant.name}`}>
                        <span className="round-score-input-wrap">
                          {isRoundWinner && (
                            <span className="winner-trophy round-winner-trophy" aria-label="Gewinner" title="Gewinner" />
                          )}
                          <input
                            type="number"
                            value={participant?.roundScores?.[roundIndex] ?? ""}
                            onChange={(event) =>
                              onRoundChange(participant.name, roundIndex, event.target.value)
                            }
                            placeholder="0"
                          />
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th>Gesamtpunkte</th>
              {participants.map((participant) => (
                <td key={`total-${participant.name}`}>
                  <strong>{calculateDetailedScore(participant, categories, visibleRoundCount)}</strong>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      )}

      {showRounds && (
        <button className="button button-secondary add-round-block-button" type="button" onClick={onAddRoundBlock}>
          Runde hinzufügen
        </button>
      )}

      {!showRounds && (
        <table className="score-detail-matrix">
          <tfoot>
            <tr>
              <th>Gesamtpunkte</th>
              {participants.map((participant) => (
                <td key={`total-${participant.name}`}>
                  <strong>{calculateDetailedScore(participant, categories, participants.length)}</strong>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

function getKnownPlayerNames(plays, currentParticipants, preferredPlayerName = "", deletedPlayerNames = []) {
  const frequencies = new Map();
  const preferredName = preferredPlayerName.trim();
  const deletedNames = new Set(deletedPlayerNames);
  const currentParticipantNames = new Set(
    currentParticipants.map((participant) => participant.name.trim().toLowerCase()),
  );

  if (preferredName) {
    frequencies.set(preferredName, frequencies.get(preferredName) ?? 0);
  }

  for (const play of plays) {
    for (const participant of play.participants ?? []) {
      const normalizedName = participant.name.trim().toLowerCase();

      if (!deletedNames.has(normalizedName) || currentParticipantNames.has(normalizedName)) {
        frequencies.set(participant.name, (frequencies.get(participant.name) ?? 0) + 1);
      }
    }
  }

  for (const participant of currentParticipants) {
    if (!frequencies.has(participant.name)) {
      frequencies.set(participant.name, 0);
    }
  }

  return [...frequencies.entries()]
    .sort((first, second) => {
      if (preferredName) {
        const firstIsPreferred = first[0].toLowerCase() === preferredName.toLowerCase();
        const secondIsPreferred = second[0].toLowerCase() === preferredName.toLowerCase();

        if (firstIsPreferred !== secondIsPreferred) {
          return firstIsPreferred ? -1 : 1;
        }
      }

      return second[1] - first[1] || first[0].localeCompare(second[0]);
    })
    .map(([name]) => name);
}

function sortSelectablePlayerNames(playerNames, selectedParticipants, plays, preferredPlayerName = "") {
  const selectedNames = new Set(
    selectedParticipants.map((participant) => participant.name.trim().toLowerCase()),
  );
  const preferredName = preferredPlayerName.trim().toLowerCase();
  const frequencies = new Map();

  for (const play of plays) {
    for (const participant of play.participants ?? []) {
      const normalizedName = participant.name.trim().toLowerCase();
      frequencies.set(normalizedName, (frequencies.get(normalizedName) ?? 0) + 1);
    }
  }

  return [...playerNames].sort((firstName, secondName) => {
    const firstNormalized = firstName.trim().toLowerCase();
    const secondNormalized = secondName.trim().toLowerCase();
    const firstIsSelected = selectedNames.has(firstNormalized);
    const secondIsSelected = selectedNames.has(secondNormalized);

    if (firstIsSelected !== secondIsSelected) {
      return firstIsSelected ? -1 : 1;
    }

    if (preferredName) {
      const firstIsPreferred = firstNormalized === preferredName;
      const secondIsPreferred = secondNormalized === preferredName;

      if (firstIsPreferred !== secondIsPreferred) {
        return firstIsPreferred ? -1 : 1;
      }
    }

    return (
      (frequencies.get(secondNormalized) ?? 0) - (frequencies.get(firstNormalized) ?? 0) ||
      firstName.localeCompare(secondName, "de")
    );
  });
}




