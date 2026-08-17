import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

export default function Profile() {
  const {
    changeEmail,
    changePassword,
    hasUsername,
    isAuthLoading,
    updateProfile,
    user,
    userProfile,
  } = useAuth();
  const { plays, renamePlayer } = useAppData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const claimedUsername = searchParams.get("claim")?.trim() ?? "";
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");

  useEffect(() => {
    setUsername(userProfile?.username ?? userProfile?.displayName ?? claimedUsername);
    setEmail(user?.email ?? userProfile?.email ?? "");
    setIsEditingUsername(!hasUsername);
  }, [claimedUsername, hasUsername, user, userProfile]);

  if (isAuthLoading) {
    return (
      <section className="page">
        <p className="page-intro">Profil wird geladen...</p>
      </section>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  async function handleUsernameSubmit(event) {
    event.preventDefault();
    setStatus("");

    const nextUsername = username.trim();
    const nextUsernameNormalized = nextUsername.toLowerCase();
    const currentUsername = (userProfile?.username || userProfile?.displayName || "")
      .trim()
      .toLowerCase();
    const participantNames = getParticipantNames(plays);
    const claimedUsernameNormalized = claimedUsername.trim().toLowerCase();

    if (!nextUsername) {
      setStatus("Bitte gib einen Benutzernamen ein.");
      return;
    }

    if (
      nextUsernameNormalized !== currentUsername &&
      nextUsernameNormalized !== claimedUsernameNormalized &&
      participantNames.has(nextUsernameNormalized)
    ) {
      setStatus(
        "Dieser Name existiert bereits als Mitspieler. Wähle bitte einen anderen Benutzernamen.",
      );
      return;
    }

    try {
      await updateProfile({ username: nextUsername, favoriteGame: "", notes: "" });
      if (currentUsername && currentUsername !== nextUsernameNormalized) {
        renamePlayer(currentUsername, nextUsername);
      }
      setIsEditingUsername(false);
      setStatus("Benutzername gespeichert.");
      if (!hasUsername) {
        navigate("/dashboard");
      }
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    setStatus("");

    try {
      await changeEmail(email);
      setIsEditingEmail(false);
      setStatus("E-Mail gespeichert.");
    } catch (error) {
      if (error.code === "auth/requires-recent-login") {
        setStatus("Bitte melde dich neu an und ändere danach die E-Mail-Adresse.");
        return;
      }

      setStatus(error.message);
    }
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordStatus("");

    if (passwordData.newPassword.length < 6) {
      setPasswordStatus("Das neue Passwort muss mindestens 6 Zeichen haben.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordStatus("Die Passwörter stimmen nicht überein.");
      return;
    }

    try {
      await changePassword(passwordData.newPassword);
      setPasswordData({ newPassword: "", confirmPassword: "" });
      setPasswordStatus("Passwort wurde geändert.");
    } catch (error) {
      if (error.code === "auth/requires-recent-login") {
        setPasswordStatus("Bitte melde dich neu an und ändere danach das Passwort.");
        return;
      }

      setPasswordStatus(error.message);
    }
  }

  return (
    <section className="page profile-page">
      <div className="page-heading">
        <p className="eyebrow">{hasUsername ? "Profil" : "Erster Login"}</p>
        <h1>{hasUsername ? "Dein Profil." : "Benutzernamen wählen."}</h1>
      </div>

      <div className="entry-form profile-form">
        <ProfileRow
          isEditing={isEditingUsername}
          label="Benutzername"
          value={userProfile?.username || userProfile?.displayName || "Noch nicht gesetzt"}
          onCancel={() => {
            setUsername(userProfile?.username ?? userProfile?.displayName ?? claimedUsername);
            setIsEditingUsername(!hasUsername);
          }}
          onEdit={() => setIsEditingUsername(true)}
          onSubmit={handleUsernameSubmit}
        >
          <input
            required
            minLength="2"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={Boolean(claimedUsername)}
          />
        </ProfileRow>

        <ProfileRow
          isEditing={isEditingEmail}
          label="E-Mail"
          value={user.email}
          onCancel={() => {
            setEmail(user.email ?? userProfile?.email ?? "");
            setIsEditingEmail(false);
          }}
          onEdit={() => setIsEditingEmail(true)}
          onSubmit={handleEmailSubmit}
        >
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </ProfileRow>

        {status && <p className="form-status">{status}</p>}
      </div>

      <form className="entry-form profile-form password-form" onSubmit={handlePasswordSubmit}>
        <div>
          <p className="eyebrow">Sicherheit</p>
          <h2>Passwort ändern.</h2>
          <p className="page-intro">
            Aus Sicherheitsgründen kann Firebase verlangen, dass du dich vorher neu anmeldest.
          </p>
        </div>

        <label>
          Neues Passwort
          <input
            required
            minLength="6"
            name="newPassword"
            type="password"
            value={passwordData.newPassword}
            onChange={handlePasswordChange}
          />
        </label>

        <label>
          Neues Passwort wiederholen
          <input
            required
            minLength="6"
            name="confirmPassword"
            type="password"
            value={passwordData.confirmPassword}
            onChange={handlePasswordChange}
          />
        </label>

        {passwordStatus && <p className="form-status">{passwordStatus}</p>}

        <button className="button button-secondary" type="submit">
          Passwort ändern
        </button>
      </form>
    </section>
  );
}

function ProfileRow({ children, isEditing, label, onCancel, onEdit, onSubmit, value }) {
  return (
    <div className="profile-row">
      <div>
        <span>{label}</span>
        {isEditing ? (
          <form className="profile-inline-form" onSubmit={onSubmit}>
            {children}
            <div className="profile-row-actions">
              <button className="button button-secondary" type="submit">
                Speichern
              </button>
              <button className="ghost-button" type="button" onClick={onCancel}>
                Abbrechen
              </button>
            </div>
          </form>
        ) : (
          <strong>{value}</strong>
        )}
      </div>
      {!isEditing && (
        <button className="ghost-button" type="button" onClick={onEdit}>
          Ändern
        </button>
      )}
    </div>
  );
}

function getParticipantNames(plays) {
  return plays.reduce((names, play) => {
    for (const participant of play.participants ?? []) {
      const normalizedName = participant.name?.trim().toLowerCase();

      if (normalizedName) {
        names.add(normalizedName);
      }
    }

    return names;
  }, new Set());
}
