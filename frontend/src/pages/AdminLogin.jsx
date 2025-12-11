import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const nav = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        setError('Invalid username or password. Please try again.');
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      localStorage.setItem('access', data.access);
      localStorage.setItem('refresh', data.refresh);
      localStorage.setItem('username', username); // Store username for dashboard display
      setIsLoading(false);
      nav('/admin-dashboard');
    } catch (err) {
      setError('Connection error. Please check your server connection.');
      setIsLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '12px'
          }}>
            🔐
          </div>
          <h2 style={{
            color: '#1e3c72',
            fontSize: '28px',
            fontWeight: '700',
            margin: '0 0 8px 0'
          }}>
            Admin Login
          </h2>
          <p style={{
            color: '#999',
            fontSize: '14px',
            margin: '0'
          }}>
            Manage matches and results
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              border: '1px solid #fca5a5'
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{
              display: 'block',
              color: '#1e3c72',
              fontWeight: '600',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Username
            </label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 8px rgba(102, 126, 234, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.boxShadow = 'none';
              }}
              disabled={isLoading}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              color: '#1e3c72',
              fontWeight: '600',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 8px rgba(102, 126, 234, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.boxShadow = 'none';
              }}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: isLoading ? 0.7 : 1,
              marginTop: '12px'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Logging in...' : '🔑 Login'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f8f9ff',
          borderRadius: '8px',
          border: '1px solid #e0e7ff',
          textAlign: 'center'
        }}>
          <p style={{
            color: '#666',
            fontSize: '12px',
            margin: '0',
            lineHeight: '1.5'
          }}>
            <strong>Demo Account:</strong><br />
            Username: <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px', color: '#667eea' }}>admin</code><br />
            Password: <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px', color: '#667eea' }}>admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
