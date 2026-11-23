import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Footer from './Footer';
import Support from '../pages/Support';
import {
  AnalyticsConsentNotice,
  AnalyticsConsentProvider,
} from './AnalyticsConsent';

beforeEach(() => {
  window.localStorage.clear();
});

test('footer quick links point to the matching application routes', () => {
  render(
    <AnalyticsConsentProvider>
      <MemoryRouter>
        <Footer />
        <AnalyticsConsentNotice />
      </MemoryRouter>
    </AnalyticsConsentProvider>
  );

  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Results' })).toHaveAttribute('href', '/results');
  expect(screen.getByRole('link', { name: 'Standings' })).toHaveAttribute('href', '/standings');
  expect(screen.getByRole('link', { name: 'Our Sponsors' })).toHaveAttribute('href', '/sponsors');
  expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  expect(screen.getByRole('link', { name: 'Rules & Regulations' }))
    .toHaveAttribute('href', '/rules-regulations');
  expect(screen.getByRole('link', { name: 'Support This Website' }))
    .toHaveAttribute('href', '/support');
});

test('footer analytics preferences opens the consent notice', () => {
  window.localStorage.setItem('ubakala-analytics-consent-v1', 'rejected');
  render(
    <AnalyticsConsentProvider>
      <MemoryRouter>
        <Footer />
        <AnalyticsConsentNotice />
      </MemoryRouter>
    </AnalyticsConsentProvider>
  );

  expect(screen.queryByRole('region', { name: 'Choose your analytics preferences' }))
    .not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Analytics preferences' }));
  expect(screen.getByRole('region', { name: 'Choose your analytics preferences' }))
    .toBeInTheDocument();
});

test('footer Support This Website link opens the support page', () => {
  render(
    <AnalyticsConsentProvider>
      <MemoryRouter initialEntries={['/']}>
        <Footer />
        <Routes>
          <Route path="/" element={<div />} />
          <Route path="/support" element={<Support />} />
        </Routes>
      </MemoryRouter>
    </AnalyticsConsentProvider>
  );

  fireEvent.click(screen.getByRole('link', { name: 'Support This Website' }));
  expect(screen.getByRole('heading', {
    name: 'SUPPORT THE UBAKALA UNITY CUP WEBSITE'
  })).toBeInTheDocument();
});
