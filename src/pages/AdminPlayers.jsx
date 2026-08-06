import { collection, getDocs } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PlayerLink from "../components/PlayerLink.jsx";
import { useAppData } from "../data/AppDataContext.jsx";
import { firestoreDb } from "../firebase/client.js";

const accountStatuses = [
  { value: "guest", label: "Mitspieler ohne Account" },
  { value: "invited", label: "Account geplant / eingeladen" },
  { value: "registered", label: "Account angelegt" },
  { value: "deleted", label: "Gelöscht" },
];

export default function AdminPlayers() {
  const { plays, playerProfiles, updatePlayerProfile, deletePlayer } = useAppData();
  const [registeredUsernames, setRegisteredUsernames] = useState([]);
  const [search, setSearch] = useState("");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [form, setForm] = useState(getEmptyForm());
  const players = useMemo(
    () => buildPlayerList(plays, playerProfiles, registeredUsernames),
    [plays, playerProfiles, registeredUsernames],
  );
  const filteredPlayers = players.filter((player) =>
    [player.name, player.accountEmail, player.accountUsername]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  useEffect(() => {
    let isMounted = true;

    async function loadRegisteredUsernames() {
      if (!firestoreDb) {
        return;
      }

      try {
        const usernameSnapshots = await getDocs(collection(firestoreDb, "usernames"));
        const usernames = usernameSnapshots.docs
          .map((usernameDoc) => usernameDoc.data()?.username?.trim() || usernameDoc.id)
          .filter(Boolean);

        if (isMounted) {
          setRegisteredUsernames(usernames);
        }
      } catch {
        if (isMounted) {
          setRegisteredUsernames([]);
        }
      }
    }

    loadRegisteredUsernames();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!registeredUsernames.length) {
      return;
    }

    const registeredUsernameMap = new Map(
      registeredUsernames.map((username) => [username.toLowerCase(), username]),
    );

    for (const profile of playerProfiles) {
      const registeredUsername =
        registeredUsernameMap.get(profile.name?.toLowerCase() ?? "") ||
        registeredUsernameMap.get(profile.accountUsername?.toLowerCase() ?? "");

      if (profile.isDeleted && registeredUsername) {
        updatePlayerProfile(profile.name, {
          ...profile,
          accountStatus: "registered",
          accountUsername: registeredUsername,
          isDeleted: false,
        });
      }
    }
  }, [playerProfiles, registeredUsernames, updatePlayerProfile]);


  function openEdit(player) {
    setEditingPlayer(player.name);
    setForm({
      accountEmail: player.accountEmail,
      accountUsername: player.accountUsername || player.name,
      accountStatus: player.accountStatus,
      favoriteGame: player.favoriteGame,
      notes: player.notes,
    });
  }

  function closeEdit() {
    setEditingPlayer(null);
    setForm(getEmptyForm());
  }

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function savePlayer(event) {
    event.preventDefault();

    if (!editingPlayer) {
      return;
    }

    updatePlayerProfile(editingPlayer, form);
    closeEdit();
  }

  function handleDeletePlayer(player) {
    const confirmed = window.confirm(
      `${player.name} als Mitspieler löschen? Alte Partien bleiben erhalten und der Name wird dort rot markiert.`,
    );

    if (confirmed) {
      deletePlayer(player.name);
    }
  }

  return (
    <section className="page">
      <div className="page-heading row-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Mitspieler verwalten.</h1>
          <p className="page-intro">
            Bestehende Mitspieler können hier für spätere Benutzerkonten vorbereitet und dokumentiert werden.
          </p>
        </div>
        <Link className="ghost-button" to="/admin">
          Zur Admin-Übersicht
        </Link>
      </div>

      <div className="panel admin-filter-panel">
        <label>
          Mitspieler suchen
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, E-Mail oder Benutzername"
          />
        </label>
      </div>

      {editingPlayer && (
        <form className="entry-form" onSubmit={savePlayer}>
          <div className="form-header">
            <div>
              <p className="eyebrow">Account vorbereiten</p>
              <h2>{editingPlayer}</h2>
            </div>
            <button className="ghost-button" type="button" onClick={closeEdit}>
              Abbrechen
            </button>
          </div>

          <div className="form-grid">
            <label>
              Gewünschter Benutzername
              <input
                value={form.accountUsername}
                onChange={(event) => updateField("accountUsername", event.target.value)}
                placeholder="z. B. basti"
              />
            </label>
            <label>
              E-Mail für Account
              <input
                type="email"
                value={form.accountEmail}
                onChange={(event) => updateField("accountEmail", event.target.value)}
                placeholder="name@example.de"
              />
            </label>
            <label>
              Account-Status
              <select
                value={form.accountStatus}
                onChange={(event) => updateField("accountStatus", event.target.value)}
              >
                {accountStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lieblingsspiel
              <input
                value={form.favoriteGame}
                onChange={(event) => updateField("favoriteGame", event.target.value)}
                placeholder="z. B. Cascadia"
              />
            </label>
            <label className="form-grid-full">
              Notizen
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="z. B. Einladung verschickt, Account später verknüpfen"
              />
            </label>
          </div>

          <button className="button" type="submit">
            Mitspieler speichern
          </button>
        </form>
      )}

      <article className="table-card admin-table-card">
        <p className="eyebrow">{filteredPlayers.length} Treffer</p>
        <h2>Spielerliste</h2>
        <table>
          <thead>
            <tr>
              <th>Mitspieler</th>
              <th>Partien</th>
              <th>Siege</th>
              <th>Status</th>
              <th>Benutzername</th>
              <th>E-Mail</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => (
              <tr key={player.name}>
                <td>
                  <strong>
                    <PlayerLink name={player.name}>{player.name}</PlayerLink>
                    {player.isDeleted && <span className="deleted-player-label"> gelöscht</span>}
                  </strong>
                </td>
                <td>{player.plays}</td>
                <td>{player.wins}</td>
                <td>
                  <span
                    className={
                      player.isDeleted
                        ? "status-pill status-pill-danger status-with-action"
                        : player.isRegistered
                          ? "status-pill status-pill-success"
                          : "status-with-action"
                    }
                  >
                    {getStatusLabel(player.accountStatus)}
                    {!player.isRegistered && (
                      <Link
                        aria-label={`${player.name} unter diesem Namen registrieren`}
                        className="register-player-link"
                        title={`${player.name} unter diesem Namen registrieren`}
                        to={`/register?username=${encodeURIComponent(player.name)}`}
                      >{"\u2197"}</Link>
                    )}
                  </span>
                </td>
                <td>{player.accountUsername || "\u2013"}</td>
                <td>{player.accountEmail || "\u2013"}</td>
                <td>
                  <button className="ghost-button inline-action" type="button" onClick={() => openEdit(player)}>
                    Bearbeiten
                  </button>
                  {!player.isDeleted && (
                    <button
                      className="ghost-button danger-action inline-action"
                      type="button"
                      onClick={() => handleDeletePlayer(player)}
                    >
                      Löschen
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredPlayers.length && <p className="empty-hint">Keine Mitspieler gefunden.</p>}
      </article>
    </section>
  );
}

function getEmptyForm() {
  return {
    accountEmail: "",
    accountUsername: "",
    accountStatus: "guest",
    favoriteGame: "",
    notes: "",
  };
}

function buildPlayerList(plays, playerProfiles, registeredUsernames) {
  const playerMap = new Map();
  const registeredUsernameMap = new Map(
    registeredUsernames.map((username) => [username.toLowerCase(), username]),
  );

  for (const play of plays) {
    for (const participant of play.participants ?? []) {
      const name = participant.name?.trim();

      if (!name) {
        continue;
      }

      const player = playerMap.get(name.toLowerCase()) ?? {
        name,
        plays: 0,
        wins: 0,
      };

      player.plays += 1;
      if (play.winner === name) {
        player.wins += 1;
      }

      playerMap.set(name.toLowerCase(), player);
    }
  }

  for (const profile of playerProfiles) {
    const key = profile.name.toLowerCase();
    const player = playerMap.get(key) ?? {
      name: profile.name,
      plays: 0,
      wins: 0,
    };

    playerMap.set(key, player);
  }

  return [...playerMap.values()]
    .map((player) => {
      const profile = playerProfiles.find(
        (entry) => entry.name.toLowerCase() === player.name.toLowerCase(),
      );
      const registeredUsername =
        registeredUsernameMap.get(player.name.toLowerCase()) ||
        registeredUsernameMap.get(profile?.accountUsername?.toLowerCase() ?? "");
      const isRegistered = Boolean(registeredUsername);
      const isDeleted = Boolean(profile?.isDeleted) && !isRegistered;

      return {
        ...player,
        accountEmail: profile?.accountEmail ?? "",
        accountUsername: registeredUsername || profile?.accountUsername || "",
        accountStatus: isDeleted ? "deleted" : isRegistered ? "registered" : profile?.accountStatus ?? "guest",
        isDeleted,
        isRegistered,
        favoriteGame: profile?.favoriteGame ?? "",
        notes: profile?.notes ?? "",
      };
    })
    .sort((first, second) => second.plays - first.plays || first.name.localeCompare(second.name));
}

function getStatusLabel(status) {
  return accountStatuses.find((entry) => entry.value === status)?.label ?? "Mitspieler ohne Account";
}
