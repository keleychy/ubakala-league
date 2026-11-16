import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  AnalyticsConsentNotice,
  AnalyticsConsentProvider,
  updateGoogleAnalyticsConsent,
  useAnalyticsConsent,
} from './AnalyticsConsent';

const STORAGE_KEY = 'ubakala-analytics-consent-v1';
const GA_DISABLE_FLAG = 'ga-disable-G-7BQMQZEQHM';

function ConsentStatus() {
  const { consent, openPreferences } = useAnalyticsConsent();
  return (
    <>
      <output data-testid="consent-value">{consent || 'undecided'}</output>
      <button type="button" onClick={openPreferences}>Open preferences</button>
    </>
  );
}

function renderConsent() {
  return render(
    <AnalyticsConsentProvider>
      <ConsentStatus />
      <AnalyticsConsentNotice />
    </AnalyticsConsentProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window[GA_DISABLE_FLAG] = true;
});

test('asks undecided visitors and persists either explicit choice', () => {
  renderConsent();

  expect(screen.getByRole('region', { name: 'Choose your analytics preferences' }))
    .toBeInTheDocument();
  expect(screen.getByTestId('consent-value')).toHaveTextContent('undecided');
  expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Reject analytics' }));
  expect(screen.queryByRole('region', { name: 'Choose your analytics preferences' }))
    .not.toBeInTheDocument();
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe('rejected');
  expect(window[GA_DISABLE_FLAG]).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Open preferences' }));
  fireEvent.click(screen.getByRole('button', { name: 'Accept analytics' }));
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe('accepted');
  expect(window[GA_DISABLE_FLAG]).toBe(false);
});

test('disables Google Analytics synchronously when consent is rejected', () => {
  window[GA_DISABLE_FLAG] = false;
  updateGoogleAnalyticsConsent('rejected');
  expect(window[GA_DISABLE_FLAG]).toBe(true);
});

test('loads a saved choice without prompting until preferences are reopened', () => {
  window.localStorage.setItem(STORAGE_KEY, 'accepted');
  renderConsent();

  expect(screen.getByTestId('consent-value')).toHaveTextContent('accepted');
  expect(screen.queryByRole('region', { name: 'Choose your analytics preferences' }))
    .not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Open preferences' }));
  expect(screen.getByRole('region', { name: 'Choose your analytics preferences' }))
    .toBeInTheDocument();
  expect(screen.getByText('Analytics are currently accepted.')).toBeInTheDocument();
});

test('shows a clear message when the browser blocks preference persistence', () => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage disabled');
  });
  renderConsent();

  fireEvent.click(screen.getByRole('button', { name: 'Accept analytics' }));

  expect(screen.getByTestId('consent-value')).toHaveTextContent('accepted');
  expect(screen.getByText(/Your choice applies for this visit/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Close analytics preferences' }))
    .toBeInTheDocument();
});
