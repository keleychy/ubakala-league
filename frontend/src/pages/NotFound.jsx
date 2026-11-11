import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-card" aria-labelledby="not-found-title">
        <p className="not-found-code">404 · Page not found</p>
        <h1 id="not-found-title">That page isn’t here</h1>
        <p className="not-found-copy">
          The link may be outdated, or the address may have been entered incorrectly.
          Choose a section below to continue.
        </p>
        <nav className="not-found-links" aria-label="Suggested pages">
          <Link to="/">Home</Link>
          <Link to="/results">Results</Link>
          <Link to="/standings">Standings</Link>
        </nav>
      </section>
    </main>
  );
}
