import React, { useEffect, useRef, useState } from 'react';
import './SponsorsShowcase.css';

export const SPONSORS = [
  { name: 'Engr. Nnamdi Ezeigbo', category: 'Junior Boys', image: null },
  { name: 'Pastor Harrison Ugochukwu Asonye', category: 'Intermediate', image: null },
  { name: 'Engr. Stanley Uche', category: 'Girls', image: null },
  { name: 'Engr. Ezinna Ogbuokiri', category: 'Men Above 50 Years', image: null },
  { name: 'RTD. Commander Macdonald Ubah', category: 'Senior Boys', image: null }
];

const ROTATION_INTERVAL = 4500;
const INTERACTION_PAUSE = 8000;
const SWIPE_THRESHOLD = 45;

function getSponsorInitials(name) {
  const words = name
    .replace(/^(Engr\.|Pastor|RTD\.)\s*/i, '')
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

function SponsorPortrait({ sponsor }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="home-sponsors-portrait" aria-hidden="true">
      {sponsor.image && !imageFailed ? (
        <img
          src={sponsor.image}
          alt=""
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{getSponsorInitials(sponsor.name)}</span>
      )}
    </div>
  );
}

export default function SponsorsShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const interactionTimeout = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }
    mediaQuery.addListener?.(updatePreference);
    return () => mediaQuery.removeListener?.(updatePreference);
  }, []);

  useEffect(() => () => {
    if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
  }, []);

  useEffect(() => {
    if (reducedMotion || hovered || focused || interactionPaused) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex(current => (current + 1) % SPONSORS.length);
    }, ROTATION_INTERVAL);
    return () => window.clearInterval(timer);
  }, [focused, hovered, interactionPaused, reducedMotion]);

  const pauseAfterInteraction = () => {
    setInteractionPaused(true);
    if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
    interactionTimeout.current = window.setTimeout(() => {
      setInteractionPaused(false);
      interactionTimeout.current = null;
    }, INTERACTION_PAUSE);
  };

  const showSponsor = index => {
    setActiveIndex((index + SPONSORS.length) % SPONSORS.length);
    pauseAfterInteraction();
  };

  const handleTouchStart = event => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = event => {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (startX === null || endX === undefined) return;
    const distance = endX - startX;
    if (Math.abs(distance) < SWIPE_THRESHOLD) return;
    showSponsor(activeIndex + (distance < 0 ? 1 : -1));
  };

  const sponsor = SPONSORS[activeIndex];

  return (
    <section
      className="home-sponsors"
      aria-labelledby="home-sponsors-title"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="home-sponsors-heading">
        <p className="home-eyebrow">WITH GRATITUDE</p>
        <h2 id="home-sponsors-title">OUR SPONSORS</h2>
        <p className="home-sponsors-intro">
          Their generosity helps bring every category of the Ubakala Unity Cup to life.
        </p>
      </header>

      <div
        className="home-sponsors-card"
        role="region"
        aria-roledescription="carousel"
        aria-label="Competition sponsors"
      >
        <span className="home-sponsors-ornament home-sponsors-ornament--top" aria-hidden="true" />
        <span className="home-sponsors-ornament home-sponsors-ornament--bottom" aria-hidden="true" />

        <button
          type="button"
          className="home-sponsors-arrow home-sponsors-arrow--previous"
          aria-label="Show previous sponsor"
          onClick={() => showSponsor(activeIndex - 1)}
        >
          <span aria-hidden="true">‹</span>
        </button>

        <div
          className="home-sponsors-slide"
          role="group"
          aria-roledescription="slide"
          aria-label={`${activeIndex + 1} of ${SPONSORS.length}`}
          aria-live="polite"
          key={sponsor.name}
        >
          <SponsorPortrait key={sponsor.name} sponsor={sponsor} />
          <div className="home-sponsors-copy">
            <p className="home-sponsors-thanks">PROUDLY SUPPORTING</p>
            <h3>{sponsor.name}</h3>
            <span className="home-sponsors-category">{sponsor.category}</span>
          </div>
        </div>

        <button
          type="button"
          className="home-sponsors-arrow home-sponsors-arrow--next"
          aria-label="Show next sponsor"
          onClick={() => showSponsor(activeIndex + 1)}
        >
          <span aria-hidden="true">›</span>
        </button>

        <div className="home-sponsors-controls">
          <div className="home-sponsors-dots" aria-label="Choose a sponsor">
            {SPONSORS.map((item, index) => (
              <button
                type="button"
                key={item.name}
                className={`home-sponsors-dot${index === activeIndex ? ' is-active' : ''}`}
                aria-label={`Show sponsor ${index + 1}: ${item.name}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => showSponsor(index)}
              />
            ))}
          </div>
          <span className="home-sponsors-count" aria-hidden="true">
            {String(activeIndex + 1).padStart(2, '0')} / {String(SPONSORS.length).padStart(2, '0')}
          </span>
        </div>
      </div>
    </section>
  );
}
