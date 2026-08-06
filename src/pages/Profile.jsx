import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { useAppData } from "../data/AppDataContext.jsx";

export default function Profile() {
  const { changePassword, hasUsername, isAuthLoading, updateProfile, user, userProfile } =
    useAuth();
  const { plays, renamePlayer } = useAppData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const claimedUsername = searchParams.get("claim")?.trim() ?? "";
  const [formData, setFormData] = useState({
    username: "",
    favoriteGame: "",
    notes: "",
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");

  useEffect(() => {
    setFormData({
      username: userProfile?.username ?? userProfile?.displayName ?? claimedUsername,
      favoriteGame: userProfile?.favoriteGame ?? "",
      notes: userProfile?.notes ?? "",
    });
  }, [claimedUsername, userProfile]);

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

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("");

    const nextUsername = formData.username.trim().toLowerCase();
    const currentUsername = (
      userProfile?.username ||
      userProfile?.displayName ||
      ""
    )
      .trim()
      .toLowerCase();
    const participantNames = getParticipantNames(plays);
    const claimedUsernameNormalized = claimedUsername.trim().toLowerCase();

    if (
      nextUsername !== currentUsername &&
      nextUsername !== claimedUsernameNormalized &&
      participantNames.has(nextUsername)
    ) {
      setStatus(
        "Dieser Name existiert bereits als Mitspieler. W\u00e4hle bitte einen anderen Benutzernamen.",
      );
      return;
    }

    try {
      await updateProfile(formData);
      if (currentUsername && currentUsername !== nextUsername) {
        renamePlayer(currentUsername, formData.username);
      }
      setStatus("Profil gespeichert.");
      if (!hasUsername) {
        navigate("/dashboard");
      }
    } catch (error) {
      setStatus(error.message);
    }
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
        <p className="page-intro">
          {hasUsername
            ? "Verwalte deine persönlichen Angaben. Der Benutzername darf keine vorhandenen Nutzer oder Mitspieler übernehmen."
            : "Bitte wähle zuerst deinen Benutzernamen. Danach kannst du MeepleMeter normal nutzen."}
        </p>
      </div>

      <form className="entry-form profile-form" onSubmit={handleSubmit}>
        <label>
          Benutzername
          <input
            required
            minLength="2"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            placeholder="z. B. Basti"
          />
        </label>

        <label>
          Lieblingsspiel
          <input
            name="favoriteGame"
            type="text"
            value={formData.favoriteGame}
            onChange={handleChange}
            placeholder="z. B. Arche Nova"
          />
        </label>

        <label>
          Notizen optional
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="z. B. bevorzugte Spielarten oder Besonderheiten"
          />
        </label>

        <div className="profile-meta">
          <span>E-Mail</span>
          <strong>{user.email}</strong>
        </div>

        {status && <p className="form-status">{status}</p>}

        <button className="button" type="submit">
          Profil speichern
        </button>
      </form>

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
            placeholder="••••••••"
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
            placeholder="••••••••"
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
