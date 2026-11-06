import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '../api/api';
import Results from './Results';

jest.mock('../api/api', () => ({
  api: {
    getSeasons: jest.fn(),
    getMatches: jest.fn()
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.getSeasons.mockResolvedValue([
    { id: 'senior-season', name: 'Senior Boys 2026', category: 'senior_boys' },
    { id: 'girls-season', name: 'Girls 2026', category: 'girls' }
  ]);
  api.getMatches.mockResolvedValue([
    {
      id: 'senior-match',
      season: { id: 'senior-season', category: 'senior_boys' },
      stage: 'GROUP',
      status: 'FINISHED',
      home_team: { name: 'Senior Eagles' },
      away_team: { name: 'Senior Rangers' },
      home_score: 1,
      away_score: 0,
      match_date: '2026-10-01'
    },
    {
      id: 'girls-match',
      season: { id: 'girls-season', category: 'girls' },
      stage: 'FINAL',
      status: 'FINISHED',
      home_team: { name: 'Girls United' },
      away_team: { name: 'Girls Stars' },
      home_score: 2,
      away_score: 1,
      match_date: '2026-10-02'
    }
  ]);
});

test('public results identify competitions by category and filter by category', async () => {
  render(<Results />);

  expect(await screen.findByText('Senior Eagles')).toBeInTheDocument();
  expect(screen.queryByText('Girls United')).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Competition category'), {
    target: { value: 'girls' }
  });

  expect(await screen.findByText('Girls United')).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.queryByText('Senior Eagles')).not.toBeInTheDocument();
  });
  expect(screen.getAllByText('Girls').length).toBeGreaterThan(0);
});
