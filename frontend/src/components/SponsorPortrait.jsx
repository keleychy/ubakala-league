import React, { useState } from 'react';
import './SponsorPortrait.css';
import { getSponsorInitials } from '../data/sponsors';

export default function SponsorPortrait({ sponsor, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`sponsor-portrait ${className}`.trim()} aria-hidden="true">
      {sponsor.image && !imageFailed ? (
        <img
          src={sponsor.image}
          alt=""
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="sponsor-portrait-fallback">
          {getSponsorInitials(sponsor.name)}
        </span>
      )}
    </div>
  );
}
