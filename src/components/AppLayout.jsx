import { NavLink, Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <a className="brand" href="/" aria-label="MeepleMeter Startseite">
          <span className="brand-mark">M</span>
          <span>MeepleMeter</span>
        </a>
        <nav className="side-nav" aria-label="App Navigation">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/games">Sammlung</NavLink>
          <NavLink to="/plays">Partien</NavLink>
          <NavLink to="/stats">Statistiken</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
