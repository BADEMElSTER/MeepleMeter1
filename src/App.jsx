import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import Admin from "./pages/Admin.jsx";
import AdminGames from "./pages/AdminGames.jsx";
import AdminPlays from "./pages/AdminPlays.jsx";
import AdminPlayers from "./pages/AdminPlayers.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import GameDetail from "./pages/GameDetail.jsx";
import GameScoring from "./pages/GameScoring.jsx";
import Games from "./pages/Games.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Plays from "./pages/Plays.jsx";
import PlayerDetail from "./pages/PlayerDetail.jsx";
import Profile from "./pages/Profile.jsx";
import Register from "./pages/Register.jsx";
import Stats from "./pages/Stats.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/games" element={<Games />} />
        <Route path="/games/by-title/:gameTitle" element={<GameDetail />} />
        <Route path="/games/:gameId/scoring" element={<GameScoring />} />
        <Route path="/games/:gameId" element={<GameDetail />} />
        <Route path="/players/:playerName" element={<PlayerDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/plays" element={<Plays />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/games" element={<AdminGames />} />
        <Route path="/admin/plays" element={<AdminPlays />} />
        <Route path="/admin/players" element={<AdminPlayers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
