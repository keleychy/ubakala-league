import React, { useState } from 'react';
import './Support.css';

const accountNumber = '0177067096';

export default function Support() {
  const [copyMessage, setCopyMessage] = useState('');

  async function copyAccountNumber() {
    if (!navigator.clipboard?.writeText) {
      setCopyMessage('Copy is unavailable in this browser. You can select the account number above.');
      return;
    }

    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopyMessage('Account number copied.');
    } catch {
      setCopyMessage('Unable to copy. You can select the account number above.');
    }
  }

  return (
    <main className="support-page">
      <div className="support-content">
        <header className="support-hero">
          <span className="support-eyebrow">A community archive, built with care</span>
          <h1>SUPPORT THE UBAKALA UNITY CUP WEBSITE</h1>
          <p>Help Keep the Competition Online and Its History Preserved.</p>
        </header>

        <article className="support-story" aria-label="About supporting the website">
          <section aria-labelledby="support-purpose-title">
            <h2 id="support-purpose-title">A platform and a community archive</h2>
            <p>
              The Ubakala Unity Cup website was independently conceived, designed,
              developed and is maintained voluntarily to provide the community with
              a reliable digital platform for competition fixtures, match results,
              standings, news, historical records and other tournament information.
            </p>
            <p>
              Beyond serving the ongoing competition, the website is also intended to
              serve as a digital archive of the Ubakala Unity Cup, preserving competition
              data, records, results, participating teams and historical information for
              future generations and future reference.
            </p>
          </section>

          <section aria-labelledby="support-maintenance-title">
            <h2 id="support-maintenance-title">What support helps maintain</h2>
            <p>
              Keeping the website operational and maintaining its data comes with
              recurring expenses. These include hosting, domain renewal, database and
              data maintenance, technical support, security, backups, preservation of
              historical records and future improvements.
            </p>
          </section>

          <section aria-labelledby="support-voluntary-title">
            <h2 id="support-voluntary-title">Your support is entirely voluntary</h2>
            <p>
              If you find the platform useful and wish to support its continued
              operation, maintenance, development and preservation of competition
              history, you are welcome to make a voluntary contribution.
            </p>
            <p>Every contribution, regardless of amount, is appreciated.</p>
            <p>
              Contributions are entirely voluntary. Access to the website and its
              information is not dependent on donations.
            </p>
            <p>
              Your support helps keep the Ubakala Unity Cup digitally accessible while
              ensuring that its history and records are preserved for the future.
            </p>
            <p>Thank you for supporting the project.</p>
          </section>
        </article>

        <section className="support-contribution" aria-labelledby="support-contribution-title">
          <div className="support-section-heading">
            <span className="support-eyebrow">Voluntary contributions</span>
            <h2 id="support-contribution-title">Choose how you would like to support</h2>
            <p>
              Bank transfer is currently the only available way to contribute. Online
              and international payment options are not set up, and no payment gateway
              is connected to this page.
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
                    <dd className="support-account-number">{accountNumber}</dd>
                  </div>
                </dl>
                <button
                  className="support-copy-button"
                  type="button"
                  onClick={copyAccountNumber}
                >
                  Copy account number
                </button>
                <span className="support-copy-message" role="status" aria-live="polite">
                  {copyMessage}
                </span>
                <div className="support-transfer-guide">
                  <h4>How to contribute by bank transfer</h4>
                  <ol>
                    <li>Choose the amount you wish to contribute; any amount is optional.</li>
                    <li>Copy the account number and make a transfer using your bank.</li>
                    <li>Check the bank and account name shown above before confirming.</li>
                  </ol>
                </div>
              </div>
              <span className="support-status support-status--available">Available</span>
            </article>
            <article className="support-payment-option">
              <span className="support-option-icon support-option-icon--online" aria-hidden="true">↗</span>
              <div>
                <h3>Online payment</h3>
                <p>No online payment option is currently available on this website.</p>
              </div>
              <span className="support-status">Not available yet</span>
            </article>
            <article className="support-payment-option">
              <span className="support-option-icon support-option-icon--global" aria-hidden="true">◎</span>
              <div>
                <h3>Contributions from abroad</h3>
                <p>There is no international payment method available at this time.</p>
              </div>
              <span className="support-status">Not available yet</span>
            </article>
          </div>

          <p className="support-voluntary-note">
            Contributions are optional. Website access and competition information
            remain available to everyone regardless of whether they donate.
          </p>
        </section>

        <section className="support-developer" aria-labelledby="support-developer-title">
          <div className="support-developer-photo">
            <img src="/developer.jpeg" alt="Ubakala Unity Cup website developer" />
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
