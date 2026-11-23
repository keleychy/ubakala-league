import React from 'react';
import { Link } from 'react-router-dom';
import SponsorPortrait from '../components/SponsorPortrait';
import { SPONSORS, SPONSOR_SEASON } from '../data/sponsors';
import './Sponsors.css';

export default function Sponsors() {
  return (
    <main className="sponsors-page">
      <div className="sponsors-page-inner">
        <Link className="sponsors-back-link" to="/">
          <span aria-hidden="true">←</span> Back to homepage
        </Link>

        <header className="sponsors-page-header">
          <p className="sponsors-page-eyebrow">{SPONSOR_SEASON}</p>
          <h1>Our Sponsors</h1>
          <p>
            We extend our heartfelt thanks to these sponsors for supporting
            the competition and its categories.
          </p>
        </header>

        <section className="sponsors-directory" aria-label="Competition sponsors">
          {SPONSORS.map(sponsor => (
            <article className="sponsors-directory-card" key={sponsor.name}>
              <SponsorPortrait
                sponsor={sponsor}
                className="sponsors-directory-portrait"
              />
              <div className="sponsors-directory-copy">
                <p className="sponsors-directory-label">WITH APPRECIATION</p>
                <h2>{sponsor.name}</h2>
                <p className="sponsors-category-label">Supporting category</p>
                <span className="sponsors-category">{sponsor.category}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="sponsors-archive" aria-labelledby="sponsors-archive-title">
          <div className="sponsors-archive-mark" aria-hidden="true">UUC</div>
          <div>
            <h2 id="sponsors-archive-title">Past Sponsors</h2>
            <p>
              Past-season sponsor details will be added here as they are confirmed.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
