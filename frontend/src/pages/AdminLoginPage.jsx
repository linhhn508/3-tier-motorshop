import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/pages.css'

function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (resp.ok) {
        const data = await resp.json()
        localStorage.setItem('admin_token', data.token)
        navigate('/admin')
      } else {
        setError('Invalid credentials')
      }
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 400, margin: '80px auto' }}>
      <div className="page-header">
        <h2>Admin Login</h2>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="admin-user">Username</label>
          <input type="text" id="admin-user" value={username}
            onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="admin-pass">Password</label>
          <input type="password" id="admin-pass" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="form-status error" role="alert">{error}</div>}
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}

export default AdminLoginPage