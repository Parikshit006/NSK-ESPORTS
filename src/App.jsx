import { Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import MobileNav from './components/layout/MobileNav';
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';
import LeaderboardPage from './pages/LeaderboardPage';
import RulesPage from './pages/RulesPage';
import TeamPortalPage from './pages/TeamPortalPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tournament/:slug" element={<HomePage />} />
        <Route path="/tournament/:slug/register" element={<RegistrationPage />} />
        <Route path="/tournament/:slug/leaderboard" element={<LeaderboardPage />} />
        <Route path="/tournament/:slug/rules" element={<RulesPage />} />
        <Route path="/tournament/:slug/portal" element={<TeamPortalPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <MobileNav />
    </>
  );
}
