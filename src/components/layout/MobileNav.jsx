import { Link, useLocation } from 'react-router-dom';

export default function MobileNav() {
  const location = useLocation();
  const slugMatch = location.pathname.match(/\/tournament\/([^/]+)/);
  const slug = slugMatch ? slugMatch[1] : null;

  const isActive = (path) => location.pathname === path ? 'active' : '';

  if (!slug) return null; // Only show on tournament pages

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        <Link to={`/tournament/${slug}`} className={`mobile-nav-item ${isActive(`/tournament/${slug}`)}`}>
          <span className="mobile-nav-icon">🏠</span>
          Home
        </Link>
        <Link to={`/tournament/${slug}/leaderboard`} className={`mobile-nav-item ${isActive(`/tournament/${slug}/leaderboard`)}`}>
          <span className="mobile-nav-icon">🏆</span>
          Board
        </Link>
        <Link to={`/tournament/${slug}/rules`} className={`mobile-nav-item ${isActive(`/tournament/${slug}/rules`)}`}>
          <span className="mobile-nav-icon">📜</span>
          Rules
        </Link>
        <Link to={`/tournament/${slug}/portal`} className={`mobile-nav-item ${isActive(`/tournament/${slug}/portal`)}`}>
          <span className="mobile-nav-icon">👤</span>
          Portal
        </Link>
      </div>
    </nav>
  );
}
