import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import Header from './Header';

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn()
}));

jest.mock('../api/firebaseClient', () => ({
  getFirebaseAuth: jest.fn(() => ({}))
}));

jest.mock('../api/firebaseAuth', () => ({
  signOutAdmin: jest.fn()
}));

test('signed-in users have a dashboard shortcut in desktop and mobile navigation', async () => {
  onAuthStateChanged.mockImplementation((auth, callback) => {
    callback({ email: 'admin@example.com' });
    return jest.fn();
  });

  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );

  const dashboardLinks = await screen.findAllByRole('link', { name: 'Dashboard' });
  expect(dashboardLinks).toHaveLength(2);
  dashboardLinks.forEach(link => expect(link).toHaveAttribute('href', '/admin-dashboard'));
});

test('marks the current page in both desktop and mobile navigation', () => {
  onAuthStateChanged.mockImplementation((auth, callback) => {
    callback(null);
    return jest.fn();
  });

  render(
    <MemoryRouter initialEntries={['/standings']}>
      <Header />
    </MemoryRouter>
  );

  const activeLinks = screen.getAllByRole('link', { name: 'Standings' });
  expect(activeLinks).toHaveLength(2);
  activeLinks.forEach(link => expect(link).toHaveAttribute('aria-current', 'page'));
});
