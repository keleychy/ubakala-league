import React from 'react';
import { act, render, screen } from '@testing-library/react';
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

  const { container } = render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );

  const dashboardLinks = await screen.findAllByRole('link', { name: 'Dashboard' });
  expect(dashboardLinks).toHaveLength(2);
  dashboardLinks.forEach(link => expect(link).toHaveAttribute('href', '/admin-dashboard'));
  expect(container.querySelector('.header-container')).toHaveClass('header-container--signed-in');
  expect(container.querySelector('.nav-desktop .nav-primary-links')).toContainElement(
    screen.getAllByRole('link', { name: 'Standings' })[0]
  );
  expect(container.querySelector('.header-top-row .nav-account-links')).toContainElement(
    screen.getAllByRole('button', { name: 'Logout' })[0]
  );
  expect(container.querySelector('.header-top-row')).toContainElement(
    container.querySelector('.nav-account-links')
  );
  expect(container.querySelector('.header-container--signed-in > .nav-desktop')).toBeInTheDocument();
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

test('shows the Predictions announcement in both menus and removes it after a week', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-12T13:18:19.960+01:00'));
  onAuthStateChanged.mockImplementation((auth, callback) => {
    callback(null);
    return jest.fn();
  });

  const { container, unmount } = render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
  expect(container.querySelectorAll('.new-feature-badge')).toHaveLength(2);

  act(() => {
    jest.advanceTimersByTime(7 * 24 * 60 * 60 * 1000);
  });
  expect(container.querySelectorAll('.new-feature-badge')).toHaveLength(0);

  unmount();
  jest.useRealTimers();
});
