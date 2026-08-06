import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function AppLayout() {
  const { isAdmin, isAuthLoading, isFirebaseConfigured, logout, user, userProfile } =
    useAuth();
  const navigate = useNavigate();
  const canSeeAdmin = !isFirebaseConfigured || isAdmin;
  const username = userProfile?.username || userProfile?.displayName || "";

  if (isAuthLoading) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <section className="page">
            <p className="page-intro">Anmeldung wird geprüft...</p>
          </section>
        </main>
      </div>
    );
  }

  if (isFirebaseConfigured && !user) {
    return <Navigate to="/" replace />;
  }

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <a className="brand" href="/" aria-label="MeepleMeter Startseite">
          <span className="brand-mark">M</span>
          <span>MeepleMeter</span>
        </a>
        <div className="topbar-actions">
          <nav className="side-nav" aria-label="App Navigation">
            {isAdmin ? (
              <NavLink to="/admin">Admin</NavLink>
            ) : (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/games">Sammlung</NavLink>
                <NavLink to="/plays">Partien</NavLink>
                <NavLink to="/stats">Statistiken</NavLink>
                {canSeeAdmin && <NavLink to="/admin">Admin</NavLink>}
              </>
            )}
          </nav>
          {user && (
            <div className="profile-actions">
              <NavLink className="profile-link" to="/profile" aria-label="Profil anzeigen">
                <span className="profile-icon" aria-hidden="true" />
                {username && <span className="profile-name">{username}</span>}
              </NavLink>
              <button className="nav-button" type="button" onClick={handleLogout}>
                Abmelden
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
