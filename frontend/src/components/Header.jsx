import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header>
      <div className="header-container">
        <h1 className="header-title">⚽ UBAKALA UNITY CUP</h1>

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
          <Link to="/admin" className="admin-button">
            Admin
          </Link>
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
          <Link to="/admin" className="admin-button" onClick={() => setMenuOpen(false)}>
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
