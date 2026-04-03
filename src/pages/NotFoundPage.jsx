import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page">
      <div className="container text-center" style={{ paddingTop: 'var(--space-20)' }}>
        <div style={{ fontSize: '80px', marginBottom: 'var(--space-4)' }}>💀</div>
        <h1 className="gradient-text" style={{ marginBottom: 'var(--space-4)' }}>404</h1>
        <h3 style={{ marginBottom: 'var(--space-6)' }}>Page Not Found</h3>
        <p className="muted-text mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-4 justify-center">
          <Link to="/" className="btn btn-primary">🏠 Go Home</Link>
          <Link to="/admin" className="btn btn-secondary">⚡ Admin Panel</Link>
        </div>
      </div>
    </div>
  );
}
