import { useRef } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const swipeRoutes = ["/dashboard", "/plays", "/stats", "/games"];

function navigateWithPageTransition(navigate, route, direction) {
  document.documentElement.dataset.pageTransitionDirection = direction;

  if (!document.startViewTransition) {
    navigate(route);
    window.setTimeout(() => {
      delete document.documentElement.dataset.pageTransitionDirection;
    }, 250);
    return;
  }

  document
    .startViewTransition(() => {
      navigate(route);
    })
    .finished.finally(() => {
      delete document.documentElement.dataset.pageTransitionDirection;
    });
}

export default function AppLayout() {
  const { isAdmin, isAuthLoading, isFirebaseConfigured, logout, user, userProfile } =
    useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const touchStartRef = useRef(null);
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

  function handleTouchStart(event) {
    if (isAdmin || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  function handleTouchEnd(event) {
    if (isAdmin || !touchStartRef.current || event.changedTouches.length !== 1) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) < 75 || Math.abs(deltaX) < Math.abs(deltaY) * 1.4) {
      return;
    }

    const currentIndex = swipeRoutes.indexOf(location.pathname);

    if (currentIndex < 0) {
      return;
    }

    const direction = deltaX < 0 ? "forward" : "back";
    const nextIndex = direction === "forward" ? currentIndex + 1 : currentIndex - 1;
    const nextRoute = swipeRoutes[nextIndex];

    if (nextRoute) {
      navigateWithPageTransition(navigate, nextRoute, direction);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="topbar-row">
          <a className="brand" href="/" aria-label="MeepleMeter Startseite">
            <span className="brand-mark">M</span>
            <span>MeepleMeter</span>
          </a>
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
        <nav className="side-nav" aria-label="App Navigation">
          {isAdmin ? (
            <NavLink to="/admin">Admin</NavLink>
          ) : (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/plays">Partien</NavLink>
              <NavLink to="/stats">Statistiken</NavLink>
              <NavLink to="/games">Sammlung</NavLink>
              {canSeeAdmin && <NavLink to="/admin">Admin</NavLink>}
            </>
          )}
        </nav>
      </header>
      <main className="app-main" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <Outlet />
      </main>
    </div>
  );
}
