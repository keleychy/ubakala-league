import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../api/api';
import Home from './Home';
import { getLagosDateKey } from '../utils/competition';

jest.mock('../api/api', () => ({
  api: {
    getTeams: jest.fn(),
    getMatches: jest.fn(),
    getSeasons: jest.fn()
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.getTeams.mockResolvedValue([]);
  api.getSeasons.mockResolvedValue([]);
});

function renderHomeWithStatus(status) {
  api.getMatches.mockResolvedValue([{
    id: 'match-1',
    season_id: 'season-1',
    season: { id: 'season-1', name: 'Intermediate 2026', category: 'intermediate' },
    stage: 'GROUP',
    status,
    home_team: { id: 'uturu', name: 'Uturu' },
    away_team: { id: 'amuzu', name: 'Amuzu' },
    home_score: 3,
    away_score: 0,
    match_date: getLagosDateKey()
  }]);

  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

test('homepage marks an awarded match as completed while preserving its status', async () => {
  renderHomeWithStatus('AWARDED');

  const card = await screen.findByRole('button', {
    name: /Uturu versus Amuzu/
  });
  expect(card).toHaveTextContent('Awarded');
  expect(card).toHaveTextContent('Match Complete');
  expect(card).not.toHaveTextContent('Full Time');
});

test('homepage keeps the full-time label for normally finished matches', async () => {
  renderHomeWithStatus('FINISHED');

  const card = await screen.findByRole('button', {
    name: /Uturu versus Amuzu/
  });
  expect(card).toHaveTextContent('Full Time');
  expect(card).not.toHaveTextContent('Match Complete');
});

test('homepage provides direct links to Predictions and Rules & Regulations', async () => {
  renderHomeWithStatus('FINISHED');

  expect(await screen.findByRole('link', { name: 'Predictions' }))
    .toHaveAttribute('href', '/predictions');
  expect(screen.getByRole('link', { name: 'Rules & Regulations' }))
    .toHaveAttribute('href', '/rules-regulations');
});

test('homepage highlights Predictions as new during its one-week announcement', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-12T13:18:19.960+01:00'));
  const { unmount } = renderHomeWithStatus('FINISHED');

  const predictionsLink = screen.getByRole('link', { name: 'Predictions' });
  expect(predictionsLink.querySelector('.new-feature-badge')).toHaveTextContent('NEW');

  unmount();
  jest.useRealTimers();
});
