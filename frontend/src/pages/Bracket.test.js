import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { api } from '../api/api';
import Bracket from './Bracket';

jest.mock('../api/api', () => ({
  api: {
    getSeasons: jest.fn(),
    getMatches: jest.fn()
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.getSeasons.mockResolvedValue([
    { id: 'season-1', name: 'Senior Boys 2026', category: 'senior_boys' }
  ]);
  api.getMatches.mockResolvedValue([
    {
      id: 'qf-1',
      season_id: 'season-1',
      match_number: 22,
      stage: 'QF',
      status: 'FINISHED',
      home_team_id: 'team-home',
      away_team_id: 'team-away',
      home_team: { id: 'team-home', name: 'Eagle FC' },
      away_team: { id: 'team-away', name: 'Rangers FC' },
      home_score: 1,
      away_score: 1,
      home_penalties: 4,
      away_penalties: 3
    }
  ]);
});

test('tournament bracket highlights and displays the winner of a penalty shootout', async () => {
  render(<Bracket />);

  const homeTeam = await screen.findByText('Eagle FC', {
    selector: '.br-team-name'
  });
  const match = homeTeam.closest('.br-match');

  expect(homeTeam.closest('.br-team')).toHaveClass('br-winner');
  expect(within(match).getByText('Rangers FC', {
    selector: '.br-team-name'
  }).closest('.br-team')).not.toHaveClass('br-winner');
  expect(match.querySelector('.br-penalty-result')).toHaveTextContent('4–3');
});

test('an unfinished level match does not reveal a winner', async () => {
  api.getMatches.mockResolvedValue([
    {
      id: 'qf-1',
      season_id: 'season-1',
      match_number: 22,
      stage: 'QF',
      status: 'LIVE',
      home_team: { id: 'team-home', name: 'Eagle FC' },
      away_team: { id: 'team-away', name: 'Rangers FC' },
      home_score: 1,
      away_score: 1,
      home_penalties: 4,
      away_penalties: 3
    }
  ]);

  render(<Bracket />);

  const homeTeam = await screen.findByText('Eagle FC', {
    selector: '.br-team-name'
  });
  expect(homeTeam.closest('.br-team')).not.toHaveClass('br-winner');
  expect(document.querySelector('.br-penalty-result')).not.toBeInTheDocument();
});
