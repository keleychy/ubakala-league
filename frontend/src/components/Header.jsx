
import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import './Header.css';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '../api/firebaseClient';
import { signOutAdmin } from '../api/firebaseAuth';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [username, setUsername] = useState(null);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    try {
      return onAuthStateChanged(getFirebaseAuth(), user => {
        setUsername(user?.email || null);
      });
    } catch {
      setUsername(null);
      return undefined;
    }
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    setLogoutError('');
    try {
      await signOutAdmin();
      navigate('/admin');
    } catch (error) {
      setLogoutError(error.message || 'Unable to sign out.');
    }
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="header-container">
        {logoutError && (
          <div className="header-auth-error" role="alert">{logoutError}</div>
        )}

        <div className="header-brand">
          <button
            type="button"
            className="header-back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            title="Go back"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <Link
            to="/"
            className="header-title"
            onClick={closeMenu}
          >
            <span className="header-brand-mark">
              <span className="header-brand-initial">U</span>
            </span>

            <span className="header-brand-text">
              <span className="header-brand-name">
                UBAKALA UNITY CUP
              </span>

              <span className="header-brand-subtitle">
                Football Competition
              </span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav
          className="nav-desktop"
          aria-label="Main navigation"
        >
          <NavLink to="/" end className="nav-link">
            Home
          </NavLink>

          <NavLink to="/results" className="nav-link">
            Results
          </NavLink>

          <NavLink to="/bracket" className="nav-link">
            Bracket
          </NavLink>

          <NavLink to="/standings" className="nav-link">
            Standings
          </NavLink>

          <NavLink to="/news" className="nav-link">
            News
          </NavLink>

          <NavLink to="/history" className="nav-link">
            History
          </NavLink>

          <NavLink to="/rules-regulations" className="nav-link">
            Rules &amp; Regulations
          </NavLink>

          <NavLink to="/predictions" className="nav-link">
            Predictions
          </NavLink>

          {username ? (
            <>
              <span className="header-username">
                {username}
              </span>

              <NavLink to="/admin-dashboard" className="admin-button">
                Dashboard
              </NavLink>

              <button
                type="button"
                className="admin-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/admin" className="admin-button">
              Admin
            </Link>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="hamburger-btn"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          {menuOpen ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>

        {/* Mobile Navigation */}
        <nav
          id="mobile-navigation"
          className={`nav-mobile ${menuOpen ? 'open' : ''}`}
          aria-label="Mobile navigation"
        >
          <div className="mobile-nav-heading">
            <span>MENU</span>
            <span className="mobile-nav-line"></span>
          </div>

          <NavLink to="/" end className="nav-link" onClick={closeMenu}>
            Home
          </NavLink>

          <NavLink to="/results" className="nav-link" onClick={closeMenu}>
            Results
          </NavLink>

          <NavLink to="/bracket" className="nav-link" onClick={closeMenu}>
            Bracket
          </NavLink>

          <NavLink to="/standings" className="nav-link" onClick={closeMenu}>
            Standings
          </NavLink>

          <NavLink to="/news" className="nav-link" onClick={closeMenu}>
            News
          </NavLink>

          <NavLink to="/history" className="nav-link" onClick={closeMenu}>
            History
          </NavLink>

          <NavLink to="/rules-regulations" className="nav-link" onClick={closeMenu}>
            Rules &amp; Regulations
          </NavLink>

          <NavLink to="/predictions" className="nav-link" onClick={closeMenu}>
            Predictions
          </NavLink>

          {username ? (
            <div className="mobile-admin-section">
              <span className="mobile-username">
                Signed in as {username}
              </span>

              <NavLink
                to="/admin-dashboard"
                className="admin-button"
                onClick={closeMenu}
              >
                Dashboard
              </NavLink>

              <button
                type="button"
                className="admin-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/admin"
              className="admin-button"
              onClick={closeMenu}
            >
              Admin Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
