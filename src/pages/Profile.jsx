import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Profile() {
  const { hasUsername, isAuthLoading, updateProfile, user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    favoriteGame: "",
    notes: "",
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    setFormData({
      username: userProfile?.username ?? userProfile?.displayName ?? "",
      favoriteGame: userProfile?.favoriteGame ?? "",
      notes: userProfile?.notes ?? "",
    });
  }, [userProfile]);

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

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("");

    try {
      await updateProfile(formData);
      setStatus("Profil gespeichert.");
      if (!hasUsername) {
        navigate("/dashboard");
      }
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="page profile-page">
      <div className="page-heading">
        <p className="eyebrow">{hasUsername ? "Profil" : "Erster Login"}</p>
        <h1>{hasUsername ? "Dein Profil." : "Benutzernamen wählen."}</h1>
        <p className="page-intro">
          {hasUsername
            ? "Verwalte deine persönlichen Angaben. Die Daten werden später für persönliche Empfehlungen und Statistiken genutzt."
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
    </section>
  );
}
