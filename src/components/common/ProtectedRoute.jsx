import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', color: 'var(--text-secondary)'
      }}>
        Loading...
      </div>
    )
  }

  if (!admin) {
    return <Navigate to="/admin" replace />
  }

  return children
}
