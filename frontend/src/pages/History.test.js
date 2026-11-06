import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import History from './History';

const archive = {
  total_matches: 3,
  note: 'Stage and group labels were not included in the source records.',
  categories: [
    {
      id: 'senior-boys',
      name: 'Senior Boys',
      matches: [{
        date: '2025-11-09T14:00:00Z',
        matchday: 1,
        venue: 'UBAKALA MAIN FIELD',
        home_team: 'UMUOSU',
        away_team: 'MGBARAKUMA',
        home_score: 0,
        away_score: 2,
        penalty_home: null,
        penalty_away: null,
        awarded: false,
        void: false
      }]
    },
    {
      id: 'girls',
      name: 'Girls',
      matches: [{
        date: '2025-11-09T16:00:00Z',
        matchday: null,
        venue: 'UBAKALA MAIN FIELD',
        home_team: 'ABAM',
        away_team: 'AMIBO',
        home_score: 1,
        away_score: 0,
        penalty_home: null,
        penalty_away: null,
        awarded: false,
        void: false
      }]
    }
  ]
};

beforeEach(() => {
  window.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => archive
  });
});

test('opens the static 2025 archive and filters match results by category', async () => {
  render(
    <MemoryRouter initialEntries={['/history']}>
      <Routes>
        <Route path="/history" element={<History />} />
        <Route path="/history/:year" element={<History />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('link', { name: /Season 2025/ }));

  expect(await screen.findByRole('heading', { name: '2025 Competition Results' })).toBeInTheDocument();
  expect(window.fetch).toHaveBeenCalledWith('/archive/2025.json');
  expect(await screen.findByText('UMUOSU')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Matchday 1' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Girls/ }));

  expect(await screen.findByText('ABAM')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Matchday not recorded' })).toBeInTheDocument();
  expect(screen.queryByText('UMUOSU')).not.toBeInTheDocument();
});

test('loads the archive directly from its season URL', async () => {
  render(
    <MemoryRouter initialEntries={['/history/2025']}>
      <Routes>
        <Route path="/history/:year" element={<History />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText('UMUOSU')).toBeInTheDocument();
  expect(window.fetch).toHaveBeenCalledTimes(1);
});
