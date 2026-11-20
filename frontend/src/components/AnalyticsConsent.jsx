import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import './AnalyticsConsent.css';

const CONSENT_STORAGE_KEY = 'ubakala-analytics-consent-v1';
const VALID_CHOICES = new Set(['accepted', 'rejected']);
const GA_DISABLE_FLAG = 'ga-disable-G-7BQMQZEQHM';
const AnalyticsConsentContext = createContext(null);

export function updateGoogleAnalyticsConsent(choice) {
  if (typeof window !== 'undefined') {
    window[GA_DISABLE_FLAG] = choice !== 'accepted';
  }
}

function readSavedChoice() {
  try {
    const savedChoice = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return {
      consent: VALID_CHOICES.has(savedChoice) ? savedChoice : null,
      storageUnavailable: false,
    };
  } catch {
    return { consent: null, storageUnavailable: true };
  }
}

export function AnalyticsConsentProvider({ children }) {
  const [savedState, setSavedState] = useState(readSavedChoice);
  const [isOpen, setIsOpen] = useState(savedState.consent === null);

  const chooseConsent = useCallback((choice) => {
    if (!VALID_CHOICES.has(choice)) return;

    updateGoogleAnalyticsConsent(choice);
    let storageUnavailable = false;
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    } catch {
      storageUnavailable = true;
    }
    setSavedState({ consent: choice, storageUnavailable });
    setIsOpen(storageUnavailable);
  }, []);

  const openPreferences = useCallback(() => setIsOpen(true), []);
  const closePreferences = useCallback(() => {
    if (savedState.consent !== null) setIsOpen(false);
  }, [savedState.consent]);

  const contextValue = useMemo(() => ({
    consent: savedState.consent,
    isOpen,
    storageUnavailable: savedState.storageUnavailable,
    chooseConsent,
    openPreferences,
    closePreferences,
  }), [savedState, isOpen, chooseConsent, openPreferences, closePreferences]);

  return (
    <AnalyticsConsentContext.Provider value={contextValue}>
      {children}
    </AnalyticsConsentContext.Provider>
  );
}

export function useAnalyticsConsent() {
  const context = useContext(AnalyticsConsentContext);
  if (!context) {
    throw new Error('useAnalyticsConsent must be used within AnalyticsConsentProvider.');
  }
  return context;
}

export function AnalyticsConsentNotice() {
  const {
    consent,
    isOpen,
    storageUnavailable,
    chooseConsent,
    closePreferences,
  } = useAnalyticsConsent();

  if (!isOpen) return null;

  return (
    <section
      className="analytics-consent"
      aria-labelledby="analytics-consent-title"
      aria-describedby="analytics-consent-description"
      aria-live="polite"
    >
      <div className="analytics-consent__heading">
        <div>
          <p className="analytics-consent__eyebrow">Your privacy</p>
          <h2 id="analytics-consent-title">Choose your analytics preferences</h2>
        </div>
        {consent !== null && (
          <button
            type="button"
            className="analytics-consent__close"
            onClick={closePreferences}
            aria-label="Close analytics preferences"
          >
            ×
          </button>
        )}
      </div>
      <p id="analytics-consent-description" className="analytics-consent__description">
        Google Analytics and Vercel Analytics are optional and help us understand
        site usage. They will not start unless you accept. You can change your
        choice at any time using Analytics preferences in the footer. Separately,
        clicks on the homepage Support button are counted as an anonymous total,
        regardless of this choice.
      </p>
      {consent !== null && (
        <p className="analytics-consent__current" role="status">
          Analytics are currently {consent}.
        </p>
      )}
      {storageUnavailable && (
        <p className="analytics-consent__storage-warning" role="status">
          {consent === null
            ? 'This browser did not allow us to read or save your preference. Analytics remain off until you choose to accept.'
            : `Your choice applies for this visit, but this browser did not allow us to save it. Analytics are ${consent}.`}
        </p>
      )}
      <div className="analytics-consent__actions">
        <button type="button" onClick={() => chooseConsent('accepted')}>
          Accept analytics
        </button>
        <button type="button" onClick={() => chooseConsent('rejected')}>
          Reject analytics
        </button>
      </div>
    </section>
  );
}
