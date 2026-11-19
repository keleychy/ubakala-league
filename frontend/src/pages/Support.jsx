import React, { useState } from 'react';
import './Support.css';

const suggestedAmounts = [1000, 2500, 5000, 10000];

const supportMessage = [
  'The Ubakala Unity Cup website was independently conceived, designed, developed and is maintained voluntarily to provide the community with a reliable digital platform for competition fixtures, match results, standings, news, historical records and other tournament information.',
  'Beyond serving the ongoing competition, the website is also intended to serve as a digital archive of the Ubakala Unity Cup, preserving competition data, records, results, participating teams and historical information for future generations and future reference.',
  'Keeping the website operational and maintaining its data comes with recurring expenses. These include hosting, domain renewal, database and data maintenance, technical support, security, backups, preservation of historical records and future improvements.',
  'If you find the platform useful and wish to support its continued operation, maintenance, development and preservation of competition history, you are welcome to make a voluntary contribution.',
  'Every contribution, regardless of amount, is appreciated.',
  'Contributions are entirely voluntary. Access to the website and its information is not dependent on donations.',
  'Your support helps keep the Ubakala Unity Cup digitally accessible while ensuring that its history and records are preserved for the future.',
  'Thank you for supporting the project.'
];

function formatNaira(amount) {
  return `₦${Number(amount).toLocaleString('en-NG')}`;
}

export default function Support() {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');

  const handleSuggestedAmount = amount => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmount = event => {
    const value = event.target.value;
    setCustomAmount(value);
    setSelectedAmount(value ? Number(value) : null);
  };

  return (
    <main className="support-page">
      <div className="support-content">
        <header className="support-hero">
          <span className="support-eyebrow">A community archive, built with care</span>
          <h1>SUPPORT THE UBakala UNITY CUP WEBSITE</h1>
          <p>Help Keep the Competition Online and Its History Preserved.</p>
        </header>

        <article className="support-story" aria-label="About supporting the website">
          {supportMessage.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </article>

        <section className="support-contribution" aria-labelledby="support-contribution-title">
          <div className="support-section-heading">
            <span className="support-eyebrow">Voluntary contributions</span>
            <h2 id="support-contribution-title">Choose how you would like to support</h2>
            <p>
              You can make a voluntary bank transfer using the details below. Online
              and international payment options are not available yet.
            </p>
          </div>

          <div className="support-payment-options">
            <article className="support-payment-option">
              <span className="support-option-icon" aria-hidden="true">₦</span>
              <div>
                <h3>Nigerian bank transfer</h3>
                <dl className="support-bank-details">
                  <div>
                    <dt>Bank</dt>
                    <dd>GTBank</dd>
                  </div>
                  <div>
                    <dt>Account name</dt>
                    <dd>Ogbuehi Kelechi Timothy</dd>
                  </div>
                  <div>
                    <dt>Account number</dt>
                    <dd className="support-account-number">0177067096</dd>
                  </div>
                </dl>
              </div>
              <span className="support-status support-status--available">Available</span>
            </article>
            <article className="support-payment-option">
              <span className="support-option-icon support-option-icon--online" aria-hidden="true">↗</span>
              <div>
                <h3>Online payment</h3>
                <p>A secure payment option will be provided after setup and approval.</p>
              </div>
              <span className="support-status">Not available yet</span>
            </article>
            <article className="support-payment-option">
              <span className="support-option-icon support-option-icon--global" aria-hidden="true">◎</span>
              <div>
                <h3>Contributions from abroad</h3>
                <p>International payment instructions will be shared when available.</p>
              </div>
              <span className="support-status">Details to come</span>
            </article>
          </div>

          <div className="support-amount-panel">
            <h3>Suggested contribution amounts</h3>
            <p>Choose an amount as a guide, or enter a custom amount. There is no obligation to contribute.</p>
            <div className="support-amount-options" role="group" aria-label="Suggested contribution amounts">
              {suggestedAmounts.map(amount => (
                <button
                  type="button"
                  className={selectedAmount === amount ? 'is-selected' : ''}
                  aria-pressed={selectedAmount === amount}
                  key={amount}
                  onClick={() => handleSuggestedAmount(amount)}
                >
                  {formatNaira(amount)}
                </button>
              ))}
            </div>
            <label className="support-custom-amount">
              Custom amount (NGN)
              <span>
                <span aria-hidden="true">₦</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={customAmount}
                  onChange={handleCustomAmount}
                  placeholder="Enter an amount"
                />
              </span>
            </label>
            {selectedAmount !== null && selectedAmount > 0 && (
              <p className="support-amount-selection" role="status">
                Selected amount: <strong>{formatNaira(selectedAmount)}</strong>
                <span> This is only a selection; no payment has been made.</span>
              </p>
            )}
          </div>

          <p className="support-voluntary-note">
            Contributions are optional. Website access and competition information
            remain available to everyone regardless of whether they donate.
          </p>
        </section>

        <section className="support-developer" aria-labelledby="support-developer-title">
          <div className="support-developer-photo" role="img" aria-label="Developer photograph will be added">
            <span>Professional photograph to be added</span>
          </div>
          <div className="support-developer-copy">
            <span className="support-eyebrow">The person behind the platform</span>
            <h2 id="support-developer-title">ABOUT THE DEVELOPER</h2>
            <p>
              The Ubakala Unity Cup website is an independent digital project conceived,
              developed and maintained voluntarily to improve the documentation,
              accessibility and preservation of the competition&apos;s records.
            </p>
            <p>
              The platform is independently developed and maintained by its creator,
              with the aim of ensuring that the competition&apos;s activities and history
              remain accessible for present and future generations.
            </p>
            <div className="support-developer-identity">
              <strong>Website Developer &amp; Maintainer</strong>
              <span>Ubakala Unity Cup</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
