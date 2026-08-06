import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function AuthCard({ mode }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isFirebaseConfigured, login, register } = useAuth();
  const invitedUsername = searchParams.get("username")?.trim() ?? "";
  const [username, setUsername] = useState(invitedUsername);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (isRegister && !username.trim()) {
      setMessage("Bitte wähle einen Benutzernamen.");
      return;
    }

    if (isRegister && password !== passwordRepeat) {
      setMessage("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRegister) {
        await register(email, password, username);
      } else {
        const loginResult = await login(email, password);
        navigate(loginResult?.role === "admin" ? "/admin" : "/dashboard");
        return;
      }

      navigate("/dashboard");
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
        {!isFirebaseConfigured && (
          <p className="muted">
            Firebase ist vorbereitet, aber noch nicht konfiguriert. Trage zuerst die Werte in .env.local ein.
          </p>
        )}
        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label>
              Benutzername
              <input
                required
                autoComplete="username"
                disabled={Boolean(invitedUsername)}
                name="register-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder=""
              />
            </label>
          )}
          <label>
            {isRegister ? "E-Mail" : "E-Mail oder Benutzername"}
            <input
              required
              autoComplete={isRegister ? "off" : "username"}
              name={isRegister ? "register-email" : "email"}
              type={isRegister ? "email" : "text"}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={isRegister ? "" : "E-Mail oder Benutzername"}
            />
          </label>
          <label>
            Passwort
            <input
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength="6"
              name={isRegister ? "register-password" : "password"}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? "" : "????????"}
            />
          </label>
          {isRegister && (
            <label>
              Passwort wiederholen
              <input
                required
                autoComplete="new-password"
                minLength="6"
                name="register-password-repeat"
                type="password"
                value={passwordRepeat}
                onChange={(event) => setPasswordRepeat(event.target.value)}
                placeholder=""
              />
            </label>
          )}
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
