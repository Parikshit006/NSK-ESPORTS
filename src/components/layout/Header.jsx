import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  
  // Extract slug from URL if on a tournament page
  const slugMatch = location.pathname.match(/\/tournament\/([^/]+)/);
  const slug = slugMatch ? slugMatch[1] : null;

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <header className="header">
      <div className="header-inner">
        <Link to={slug ? `/tournament/${slug}` : '/'} className="header-logo">
          <img src="/ff-logo.webp" alt="Free Fire Max" style={{ height: 32 }} />
          <span>TOURNAMENT</span>
        </Link>
        <nav className="header-nav">
          {slug ? (
            <>
              <Link to={`/tournament/${slug}`} className={isActive(`/tournament/${slug}`)}>Home</Link>
              <Link to={`/tournament/${slug}/leaderboard`} className={isActive(`/tournament/${slug}/leaderboard`)}>Leaderboard</Link>
              <Link to={`/tournament/${slug}/rules`} className={isActive(`/tournament/${slug}/rules`)}>Rules</Link>
              <Link to={`/tournament/${slug}/register`} className={isActive(`/tournament/${slug}/register`)}>Register</Link>
              <Link to={`/tournament/${slug}/portal`} className={isActive(`/tournament/${slug}/portal`)}>Portal</Link>
            </>
          ) : (
            <>
              <Link to="/" className={isActive('/')}>Home</Link>
              <Link to="/admin" className={isActive('/admin')}>Admin</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
