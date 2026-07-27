import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { firebaseConfigStatus } from "../firebase/client.js";

export default function AuthCard({ mode }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const { isFirebaseConfigured, login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }

      navigate(isRegister ? "/profile" : "/dashboard");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand auth-brand" to="/">
          <span className="brand-mark">M</span>
          <span>MeepleMeter</span>
        </Link>
        <p className="eyebrow">{isRegister ? "Konto erstellen" : "Einloggen"}</p>
        <h1>{isRegister ? "Starte deine Sammlung." : "Willkommen zurück."}</h1>
        <p className="muted">
          {isFirebaseConfigured
            ? "Firebase Auth ist aktiv. Du kannst dich anmelden oder ein Konto erstellen."
            : "Firebase ist vorbereitet, aber noch nicht konfiguriert. Trage zuerst die Werte in .env.local ein."}
        </p>
        <p className="form-message">
          Firebase Debug: Projekt {firebaseConfigStatus.projectId || "fehlt"}, Auth-Domain{" "}
          {firebaseConfigStatus.authDomain || "fehlt"}, Key {firebaseConfigStatus.apiKeyPrefix}... (
          {firebaseConfigStatus.apiKeyLength} Zeichen)
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            E-Mail
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="du@example.com"
            />
          </label>
          <label>
            Passwort
            <input
              required
              minLength="6"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>
          {message && <p className="form-message">{message}</p>}
          <button className="button" disabled={!isFirebaseConfigured || isSubmitting} type="submit">
            {isSubmitting ? "Bitte warten..." : isRegister ? "Registrieren" : "Einloggen"}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? "Schon ein Konto?" : "Noch kein Konto?"}{" "}
          <Link to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Einloggen" : "Registrieren"}
          </Link>
        </p>
      </section>
    </main>
  );
}
