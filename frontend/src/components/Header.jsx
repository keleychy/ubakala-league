import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import { logout } from '../api/auth';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [username, setUsername] = useState(null);

  useEffect(() => {
    setUsername(localStorage.getItem('username'));
    const onStorage = () => setUsername(localStorage.getItem('username'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <header>
      <div className="header-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="header-back" onClick={() => navigate(-1)} aria-label="Go back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <Link to="/" className="header-title">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚽</span>
              <span style={{ fontWeight: 700 }}>UBAKALA UNITY CUP</span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="nav-desktop">
          <Link to="/" className="nav-link">
            Home
          </Link>
          <Link to="/results" className="nav-link">
            Results
          </Link>
          <Link to="/bracket" className="nav-link">
            Bracket
          </Link>
          <Link to="/standings" className="nav-link">
            Standings
          </Link>
          <Link to="/news" className="nav-link">
            News
          </Link>
          <Link to="/history" className="nav-link">
            History
          </Link>
          {username ? (
            <>
              <span style={{ marginRight: 8, color: '#e6eefc', fontWeight: 600 }}>{username}</span>
              <button className="admin-button" onClick={() => { logout(); navigate('/admin'); }}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/admin" className="admin-button">
              Admin
            </Link>
          )}
        </nav>

        {/* Hamburger Menu Button */}
        <button
          className="hamburger-btn"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        {/* Mobile Dropdown Menu */}
        <nav className={`nav-mobile ${menuOpen ? 'open' : ''}`}>
          <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link to="/results" className="nav-link" onClick={() => setMenuOpen(false)}>
            Results
          </Link>
          <Link to="/bracket" className="nav-link" onClick={() => setMenuOpen(false)}>
            Bracket
          </Link>
          <Link to="/standings" className="nav-link" onClick={() => setMenuOpen(false)}>
            Standings
          </Link>
          <Link to="/news" className="nav-link" onClick={() => setMenuOpen(false)}>
            News
          </Link>
          <Link to="/history" className="nav-link" onClick={() => setMenuOpen(false)}>
            History
          </Link>
          {username ? (
            <button className="admin-button" onClick={() => { setMenuOpen(false); logout(); navigate('/admin'); }}>
              Logout
            </button>
          ) : (
            <Link to="/admin" className="admin-button" onClick={() => setMenuOpen(false)}>
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
