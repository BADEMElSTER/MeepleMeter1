import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function AppLayout() {
  const { hasUsername, isAdmin, isAuthLoading, isFirebaseConfigured, logout, user, userProfile } =
    useAuth();
  const location = useLocation();
  const canSeeAdmin = !isFirebaseConfigured || isAdmin;
  const username = userProfile?.username || userProfile?.displayName || "";

  if (!isAuthLoading && user && !hasUsername && location.pathname !== "/profile") {
    return <Navigate to="/profile" replace />;
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
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/games">Sammlung</NavLink>
            <NavLink to="/plays">Partien</NavLink>
            <NavLink to="/stats">Statistiken</NavLink>
            {canSeeAdmin && <NavLink to="/admin">Admin</NavLink>}
          </nav>
          {user && (
            <div className="profile-actions">
              <NavLink className="profile-link" to="/profile" aria-label="Profil anzeigen">
                <span className="profile-icon" aria-hidden="true" />
                {username && <span className="profile-name">{username}</span>}
              </NavLink>
              <button className="nav-button" type="button" onClick={logout}>
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
