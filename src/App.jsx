import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Header from './components/layout/Header';
import MobileNav from './components/layout/MobileNav';

const HomePage         = lazy(() => import('./pages/HomePage'));
const RegistrationPage = lazy(() => import('./pages/RegistrationPage'));
const LeaderboardPage  = lazy(() => import('./pages/LeaderboardPage'));
const RulesPage        = lazy(() => import('./pages/RulesPage'));
const TeamPortalPage   = lazy(() => import('./pages/TeamPortalPage'));
const AdminPage        = lazy(() => import('./pages/AdminPage'));
const NotFoundPage     = lazy(() => import('./pages/NotFoundPage'));

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', color: 'var(--text-secondary)'
    }}>
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </main>
      <MobileNav />
    </>
  );
}
