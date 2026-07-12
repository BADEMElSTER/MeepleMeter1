import { Link } from "react-router-dom";

export default function AuthCard({ mode }) {
  const isRegister = mode === "register";

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
          Authentifizierung ist noch nicht angebunden. Dieses Formular dient als
          Platzhalter für Firebase oder ein anderes Backend.
        </p>
        <form className="auth-form">
          <label>
            E-Mail
            <input type="email" placeholder="du@example.com" />
          </label>
          <label>
            Passwort
            <input type="password" placeholder="••••••••" />
          </label>
          <button className="button" type="button">
            {isRegister ? "Registrieren" : "Einloggen"}
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
