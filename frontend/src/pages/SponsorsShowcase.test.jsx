import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SponsorsShowcase from './SponsorsShowcase';

const originalMatchMedia = window.matchMedia;

function setReducedMotion(matches) {
  window.matchMedia = jest.fn().mockReturnValue({
    matches,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  });
}

function renderShowcase() {
  return render(
    <MemoryRouter>
      <SponsorsShowcase />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  setReducedMotion(false);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  window.matchMedia = originalMatchMedia;
});

test('shows the supplied sponsors with their correct categories', () => {
  renderShowcase();

  const expectedSponsors = [
    [
      'RTD. Commander Macdonald Ubah',
      'Senior Boys',
      '/images/sponsors/RTD-Commander%20-Macdonald%20Ubah.jpg'
    ],
    ['Engr. Nnamdi Ezeigbo', 'Junior Boys', '/images/sponsors/engr-nnamdi-ezeigbo.jpg'],
    [
      'Pastor Harrison Ugochukwu Asonye',
      'Intermediate',
      '/images/sponsors/Pastor%20Harrison%20Ugochukwu%20Asonye.jpeg'
    ],
    [
      'Engr. Stanley Uche',
      'Girls',
      '/images/sponsors/Engr.%20Stanley%20Uche.png'
    ],
    [
      'Engr. Ezinna Ogbuokiri',
      'Men Above 50 Years',
      '/images/sponsors/Engr.%20Ezinna%20Ogbuokiri.jpeg'
    ],
  ];

  expectedSponsors.forEach(([name, category, image], index) => {
    if (index > 0) {
      fireEvent.click(screen.getByRole('button', { name: 'Show next sponsor' }));
    }
    expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    expect(screen.getByText(category)).toBeInTheDocument();
    if (image) {
      expect(screen.getByRole('region', { name: 'Competition sponsors' })
        .querySelector('.home-sponsors-portrait img')).toHaveAttribute('src', image);
    }
  });
});

test('automatically advances and manual controls wrap through the sponsor list', () => {
  renderShowcase();

  act(() => jest.advanceTimersByTime(4500));
  expect(screen.getByRole('heading', { name: 'Engr. Nnamdi Ezeigbo' }))
    .toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Show previous sponsor' }));
  expect(screen.getByRole('heading', { name: 'RTD. Commander Macdonald Ubah' }))
    .toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show previous sponsor' }));
  expect(screen.getByRole('heading', { name: 'Engr. Ezinna Ogbuokiri' }))
    .toBeInTheDocument();
});

test('pauses on hover and resumes after the pointer leaves', () => {
  renderShowcase();
  const carousel = screen.getByRole('region', { name: 'Competition sponsors' });

  fireEvent.mouseEnter(carousel);
  act(() => jest.advanceTimersByTime(9000));
  expect(screen.getByRole('heading', { name: 'RTD. Commander Macdonald Ubah' }))
    .toBeInTheDocument();

  fireEvent.mouseLeave(carousel);
  act(() => jest.advanceTimersByTime(4500));
  expect(screen.getByRole('heading', { name: 'Engr. Nnamdi Ezeigbo' }))
    .toBeInTheDocument();
});

test('supports touch swipes and pauses rotation briefly after interaction', () => {
  renderShowcase();
  const carousel = screen.getByRole('region', { name: 'Competition sponsors' });

  fireEvent.touchStart(carousel, { changedTouches: [{ clientX: 240 }] });
  fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 160 }] });
  expect(screen.getByRole('heading', { name: 'Engr. Nnamdi Ezeigbo' }))
    .toBeInTheDocument();

  act(() => jest.advanceTimersByTime(4500));
  expect(screen.getByRole('heading', { name: 'Engr. Nnamdi Ezeigbo' }))
    .toBeInTheDocument();
});

test('does not auto-rotate when reduced motion is preferred', () => {
  setReducedMotion(true);
  renderShowcase();

  act(() => jest.advanceTimersByTime(15000));
  expect(screen.getByRole('heading', { name: 'RTD. Commander Macdonald Ubah' }))
    .toBeInTheDocument();
});

test('links the homepage showcase to the complete sponsors page', () => {
  renderShowcase();

  expect(screen.getByRole('link', { name: 'Meet all our sponsors' }))
    .toHaveAttribute('href', '/sponsors');
});
